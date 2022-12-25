import {NetworkLayer} from '../../../network';
import {PhaserLayer} from '../../types';
import {
  defineComponentSystem,
  EntityIndex,
  getComponentValueStrict,
  Has,
  hasComponent,
  removeComponent,
  runQuery,
  setComponent
} from '@latticexyz/recs';
import {angleTowardPosition, coordsEq} from '../../../../utils/coords';
import {createEntity, getEntityWithComponentValue} from '../../../../utils/entity';
import {isMapTileJungle} from '../../../../utils/mapData';
import {Coord} from '@latticexyz/utils';
import {challengeTilesOffsetList} from '../../../../utils/challengeTiles';
import {
  calculateSharedKey,
  entityToFieldElem,
  getPrivateKey,
  getPublicKey,
  offsetToFieldElem,
  poseidon,
  poseidonChainRoot,
  poseidonEncrypt,
  toBigInt
} from '../../../../utils/secretSharing';
import {hiddenSearchLiquidationProver, hiddenSearchProver, positionCommitmentProver} from '../../../../utils/zkProving';
import {getRandomNonce} from '../../../../utils/random';
import {getSingletonComponentValue, getSingletonComponentValueStrict} from '../../../../utils/singletonComponent';
import {ChallengeType} from '../../../network/components/ChallengeTilesComponent';
import {RESPONSE_PERIOD} from '../../../../constants';
import {getConnectedAddress, resolveChallengeTiles} from './utils';

export function createChallengeCreationSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    api: {search, hiddenSearch, hiddenSearchLiquidate, attack, jungleAttack},
    components: {PositionCommitment, JungleMoveCount, PublicKey, ControlledBy, NullifierQueue}
  } = network;

  const {
    scenes: {Main},
    components: {
      LocalPosition, Nonce, CursorTilePosition, PrimingSearch, ParsedMapData, ActionSourcePosition,
      PotentialChallengeTiles, PendingChallengeTiles, PotentialPositions, PrivateKey,
      PendingHiddenChallengeTilesEntity, PrimingAttack, PrimingChallenge
    }
  } = phaser;

  // Gets the direction index for the current aiming direction from the action source position
  const getDirectionIndex = (actionSourcePosition: Coord) => {
    const cursorPosition = getSingletonComponentValue(CursorTilePosition);
    if (!cursorPosition) return undefined;

    // Bias corrects slight direction mismatch for some angles
    const bias = 5;
    const angle = angleTowardPosition(actionSourcePosition, cursorPosition) + bias;
    return Math.floor(angle / 360 * challengeTilesOffsetList.length);
  };

  const updatePotentialChallengeTiles = (entity: EntityIndex) => {
    const actionSourcePosition = getComponentValueStrict(ActionSourcePosition, entity);
    const directionIndex = getDirectionIndex(actionSourcePosition);
    if (directionIndex === undefined) return;

    const offsets = challengeTilesOffsetList[directionIndex];
    const xValues = [] as number[];
    const yValues = [] as number[];
    offsets.forEach(([xOffset, yOffset]) => {
      xValues.push(actionSourcePosition.x + xOffset);
      yValues.push(actionSourcePosition.y + yOffset);
    });
    const challengeType = hasComponent(PrimingAttack, entity) ?
      ChallengeType.ATTACK : ChallengeType.SEARCH;
    setComponent(PotentialChallengeTiles, entity, {xValues, yValues, challengeType});
  };

  // Updates PrimingChallenge when either PrimingAttack or PrimingSearch changes
  defineComponentSystem(world, PrimingAttack, ({entity, value}) => {
    if (value[0]) setComponent(PrimingChallenge, entity, {value: true});
    else removeComponent(PrimingChallenge, entity);
  });
  defineComponentSystem(world, PrimingSearch, ({entity, value}) => {
    if (value[0]) setComponent(PrimingChallenge, entity, {value: true});
    else removeComponent(PrimingChallenge, entity);
  });

  // Updates the potential challenge tiles when the cursor moves
  defineComponentSystem(world, CursorTilePosition, ({value}) => {
    const entity = getEntityWithComponentValue(PrimingChallenge);
    const cursorPosition = value[0];
    if (entity && cursorPosition) {
      updatePotentialChallengeTiles(entity);
    }
  });

  // Updates the potential challenge tiles when PrimingChallenge changes
  defineComponentSystem(world, PrimingChallenge, ({entity, value}) => {
    if (value[0]) {
      updatePotentialChallengeTiles(entity);
    } else {
      removeComponent(PotentialChallengeTiles, entity);
    }
  });

  // Updates the potential challenge tiles when the ActionSourcePosition changes
  defineComponentSystem(world, ActionSourcePosition, ({entity}) => {
    if (hasComponent(PrimingChallenge, entity)) {
      updatePotentialChallengeTiles(entity);
    }
  });

  // Returns the first entity found (if one exists) whose potential positions overlap with the
  // current potential challenge tiles (used for the search)
  const getPotentiallyFoundEntity = (challengingEntity: EntityIndex) => {
    const challengeTiles = getComponentValueStrict(PotentialChallengeTiles, challengingEntity);
    const challengeTilesInJungle = challengeTiles.xValues.reduce((arr, x, index) => {
      const position = {x, y: challengeTiles.yValues[index]};
      if (isMapTileJungle(ParsedMapData, position)) {
        arr.push(position);
      }
      return arr;
    }, [] as Coord[]);

    if (challengeTilesInJungle.length === 0) return undefined;

    const entities = runQuery([Has(PotentialPositions)]);
    return Array.from(entities.values()).find(entity => {
      if (entity === challengingEntity) return false;

      const potentialPositions = getComponentValueStrict(PotentialPositions, entity);
      return potentialPositions.xValues.find((x, index) => {
        return challengeTilesInJungle.find(
          challengeTile => coordsEq(challengeTile, {x, y: potentialPositions.yValues[index]})
        ) !== undefined;
      }) !== undefined;
    });
  };

  // TODO make it so that the client can't submit any actions for an entity if there are pending
  // challenges for it VVV

  // Handles submission of a search/hidden search, converting potential challenge tiles to
  // pending challenge tiles, and the creation of a liquidation timeout if it's a hidden search
  Main.input.click$.subscribe(() => {
    const challengerEntity = getEntityWithComponentValue(PrimingChallenge);
    if (!challengerEntity) return;

    const actionSourcePosition = getComponentValueStrict(ActionSourcePosition, challengerEntity);
    const directionIndex = getDirectionIndex(actionSourcePosition);

    if (directionIndex === undefined) return;

    const [challengeTilesEntity, challengeTilesEntityID] = createEntity(world);

    // Either performs an attack or a search
    if (hasComponent(PrimingAttack, challengerEntity)) {
      if (hasComponent(JungleMoveCount, challengerEntity)) {
        const nonce = getComponentValueStrict(Nonce, challengerEntity).value;
        positionCommitmentProver({...actionSourcePosition, nonce}).then(({proofData}) => {
          jungleAttack(
            world.entities[challengerEntity], actionSourcePosition, proofData,
            challengeTilesEntityID, directionIndex
          );
        });
      } else {
        attack(world.entities[challengerEntity], challengeTilesEntityID, directionIndex);
      }
    } else {
      // Either performs a hidden search from the jungle, or a normal search from the plains
      if (hasComponent(JungleMoveCount, challengerEntity)) {
        const challengedEntityIndex = getPotentiallyFoundEntity(challengerEntity);
        if (challengedEntityIndex !== undefined) {
          const responderAddress = getComponentValueStrict(ControlledBy, challengedEntityIndex).value;
          const offsetList = challengeTilesOffsetList[directionIndex];
          const challengeTilesOffsetsXValues = offsetList.map(([x]) => x);
          const challengeTilesOffsetsYValues = offsetList.map(([, y]) => y);

          const challengerPrivateKey = getPrivateKey(PrivateKey);
          const challengerPublicKey = getPublicKey(PublicKey, getConnectedAddress(network));
          const responderPublicKey = getPublicKey(PublicKey, responderAddress);

          const position = actionSourcePosition;
          const challengeTilesXValues = challengeTilesOffsetsXValues.map(x => x + position.x);
          const challengeTilesYValues = challengeTilesOffsetsYValues.map(y => y + position.y);
          const challengedEntity = entityToFieldElem(world.entities[challengedEntityIndex]);
          const nullifierNonce = getRandomNonce();
          const sharedKey = calculateSharedKey(PrivateKey, PublicKey, responderAddress);
          const encryptionNonce = getRandomNonce();
          const cipherText = poseidonEncrypt(
            [...challengeTilesXValues, ...challengeTilesYValues, challengedEntity, nullifierNonce],
            sharedKey, encryptionNonce
          );

          hiddenSearchProver({
            ...getComponentValueStrict(LocalPosition, challengerEntity),
            positionCommitmentNonce: getComponentValueStrict(Nonce, challengerEntity).value,
            challengerPrivateKey, responderPublicKey,
            challengeTilesOffsetsXValues: challengeTilesOffsetsXValues.map(offsetToFieldElem),
            challengeTilesOffsetsYValues: challengeTilesOffsetsYValues.map(offsetToFieldElem),
            challengedEntity, nullifierNonce,
            positionCommitment: getComponentValueStrict(PositionCommitment, challengerEntity).value,
            challengerPublicKey, cipherText, encryptionNonce
          }).then(({proofData}) => {
            const [, hiddenChallengeEntity] = createEntity(world);
            hiddenSearch(
              world.entities[challengerEntity], hiddenChallengeEntity, cipherText, encryptionNonce,
              proofData
            );
            setComponent(
              PendingHiddenChallengeTilesEntity,
              challengedEntityIndex,
              {value: challengeTilesEntity}
            );

            // Liquidate the owner of the entity if the correct nullifier hasn't been submitted once
            // the response period has ended
            setTimeout(() => {
              const nullifier = poseidon(
                poseidonChainRoot([...challengeTilesXValues, ...challengeTilesYValues]),
                challengedEntity, sharedKey[0], nullifierNonce
              );
              const nullifierQueue = getSingletonComponentValueStrict(NullifierQueue);
              if (!nullifierQueue.queue.map(toBigInt).includes(nullifier)) {
                console.log('Liquidating >:D');
                const nullifierMerkleQueueValues = [
                  ...nullifierQueue.queue.slice(
                    nullifierQueue.headIndex, nullifierQueue.queue.length
                  ),
                  ...nullifierQueue.queue.slice(0, nullifierQueue.headIndex)
                ].map(toBigInt);

                hiddenSearchLiquidationProver({
                  challengerPrivateKey, responderPublicKey,
                  challengeTilesXValues, challengeTilesYValues,
                  nullifierNonce, nullifierMerkleQueueValues,
                  challengedEntity, challengerPublicKey,
                  cipherText, encryptionNonce,
                  nullifierMerkleQueueRoot: poseidonChainRoot(nullifierMerkleQueueValues)
                }).then(({proofData}) => {
                  hiddenSearchLiquidate(
                    hiddenChallengeEntity, world.entities[challengedEntityIndex], nullifier, proofData
                  );

                  resolveChallengeTiles(phaser, challengeTilesEntity);
                });
              }
            }, (RESPONSE_PERIOD + 2) * 1000); // 12 seconds, response period + 2 secs to be safe
          });
        } else {
          // Converts the pending challenge tiles to resolved even though no transaction was submitted
          setTimeout(() => resolveChallengeTiles(phaser, challengeTilesEntity), 1000);
        }
      } else {
        search(world.entities[challengerEntity], challengeTilesEntityID, directionIndex);
      }
    }

    const potentialChallengeTiles = getComponentValueStrict(PotentialChallengeTiles, challengerEntity);
    removeComponent(PrimingSearch, challengerEntity);
    setComponent(PendingChallengeTiles, challengeTilesEntity, potentialChallengeTiles);
  });
}
