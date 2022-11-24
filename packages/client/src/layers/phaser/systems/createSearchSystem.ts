import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {
  defineComponentSystem,
  EntityID,
  EntityIndex,
  getComponentValue,
  getComponentValueStrict,
  hasComponent,
  removeComponent,
  setComponent
} from '@latticexyz/recs';
import {angleTowardPosition, coordsEq, positionToIndex} from '../../../utils/coords';
import {drawTileSprites} from '../../../utils/drawing';
import {getEntityWithComponentValue, getGodIndexStrict, getUniqueEntityId} from '../../../utils/entity';
import {getParsedMapData, isMapTileJungle} from '../../../utils/mapData';
import {Coord} from '@latticexyz/utils';
import {ComponentValueFromComponent, lastElementOf} from '../../../utils/misc';
import {spearHitTileOffsetList} from '../../../utils/hitTiles';
import {Sprites} from '../constants';
import {
  calculateSharedKey,
  decryptSecretNonce,
  encryptSecretNonce,
  getSearchResponseProofInputs,
  poseidon
} from '../../../utils/secretSharing';
import {searchResponseProver} from '../../../utils/zkProving';
import {difference} from 'lodash';
import {getRandomNonce} from '../../../utils/random';

// TODO refactor to remove the duplicate functionality between this and the attack system?

export function createSearchSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    network: {connectedAddress},
    api: {search, searchRespond},
    components: {
      ChallengeTiles, PendingChallenges, MapData, PositionCommitment, JungleMoveCount, PublicKey,
      SearchResult, ControlledBy, Dead
    },
  } = network;

  const {
    scenes: {Main},
    components: {
      LocalPosition, LocallyControlled, Nonce, CursorTilePosition, PrimingSearch,
      PotentialChallengeTiles, PendingChallengeTiles, ResolvedChallengeTiles, ActionSourcePosition,
      PotentialPositions, PrivateKey, LocalJungleMoveCount, LastKnownPositions
    },
  } = phaser;

  const getAttackDirectionIndex = (actionSourcePosition: Coord) => {
    const cursorPosition = getComponentValue(CursorTilePosition, getGodIndexStrict(world));
    if (!cursorPosition) return undefined;

    // Bias corrects slight direction mismatch for some angle
    const bias = 5;
    const angle = angleTowardPosition(actionSourcePosition, cursorPosition) + bias;
    return Math.floor(angle / 360 * spearHitTileOffsetList.length);
  };

  const updatePotentialChallengeTiles = (entity: EntityIndex) => {
    const actionSourcePosition = getComponentValueStrict(ActionSourcePosition, entity);
    const directionIndex = getAttackDirectionIndex(actionSourcePosition);
    if (directionIndex === undefined) return;

    const offsets = spearHitTileOffsetList[directionIndex];
    const xValues = [] as number[];
    const yValues = [] as number[];
    offsets.forEach(([xOffset, yOffset]) => {
      xValues.push(actionSourcePosition.x + xOffset);
      yValues.push(actionSourcePosition.y + yOffset);
    });
    setComponent(PotentialChallengeTiles, entity, {xValues, yValues});
  };

  // Updates the potential challenge tiles when the cursor moves
  defineComponentSystem(world, CursorTilePosition, ({value}) => {
    const entity = getEntityWithComponentValue(PrimingSearch);
    const cursorPosition = value[0];
    if (entity && cursorPosition) {
      updatePotentialChallengeTiles(entity);
    }
  });

  // Updates the potential challenge tiles when PrimingSearch changes
  defineComponentSystem(world, PrimingSearch, ({entity, value}) => {
    if (value[0]) {
      updatePotentialChallengeTiles(entity);
    } else {
      removeComponent(PotentialChallengeTiles, entity);
    }
  });

  // Updates the potential challenge tiles when the ActionSourcePosition changes
  defineComponentSystem(world, ActionSourcePosition, ({entity}) => {
    if (getComponentValue(PrimingSearch, entity)) {
      updatePotentialChallengeTiles(entity);
    }
  });

  // Handles drawing and removal of potential challenge tiles sprites
  defineComponentSystem(world, PotentialChallengeTiles, ({entity, value}) => {
    drawTileSprites(
      Main, entity, 'PotentialChallengeTiles', value[0], value[1], Sprites.Eye, {alpha: 0.4}
    );
  });

  // TODO prevent creating a new attack if there is already one pending?

  // Handles submission of an attack, and converting potential challenge tiles to pending challenge tiles
  Main.input.click$.subscribe(() => {
    const entity = getEntityWithComponentValue(PrimingSearch);
    if (!entity) return;

    const actionSourcePosition = getComponentValueStrict(ActionSourcePosition, entity);
    const directionIndex = getAttackDirectionIndex(actionSourcePosition);
    if (directionIndex !== undefined) {
      const challengeTilesEntityID = getUniqueEntityId(world);
      const challengeTilesEntity = world.registerEntity({id: challengeTilesEntityID});
      if (hasComponent(JungleMoveCount, entity)) {
        // TODO allow searching from within the jungle?
        // const nonce = getComponentValueStrict(Nonce, entity).value;
        // positionCommitmentProver({...actionSourcePosition, nonce}).then(({proofData}) => {
        //   jungleAttack(
        //     world.entities[entity], actionSourcePosition, proofData, challengeTilesEntityID, directionIndex
        //   );
        // });
      } else {
        search(world.entities[entity], challengeTilesEntityID, directionIndex);
      }

      const potentialChallengeTiles = getComponentValueStrict(PotentialChallengeTiles, entity);
      removeComponent(PrimingSearch, entity);
      setComponent(PendingChallengeTiles, challengeTilesEntity, potentialChallengeTiles);
    }
  });

  // Handles drawing and removal of pending challenge tiles sprites
  defineComponentSystem(world, PendingChallengeTiles, ({entity, value}) => {
    drawTileSprites(
      Main, entity, 'PendingChallengeTiles', value[0], value[1], Sprites.Eye, {alpha: 0.7}
    );
  });

  type ChallengeTilesType = ComponentValueFromComponent<typeof PendingChallengeTiles>;

  // Removes resolved challenge tiles after 1 second
  const createChallengeTilesExpiryTimeout = (
    challengeTilesEntity: EntityIndex, challengeTilesToExpire: ChallengeTilesType
  ) => setTimeout(() => {
    const oldResolvedChallengeTiles = getComponentValueStrict(ResolvedChallengeTiles, challengeTilesEntity);

    // Remove the component if getting rid of the expiring resolved challenge tiles would make it
    // empty, otherwise just filter out the expiring challenge tiles
    if (oldResolvedChallengeTiles.xValues.length === challengeTilesToExpire.xValues.length) {
      removeComponent(ResolvedChallengeTiles, challengeTilesEntity);
    } else {
      const indicesToRemove = new Set(challengeTilesToExpire.xValues.map((x, index) => (
        positionToIndex({x, y: challengeTilesToExpire.yValues[index]})
      )));
      const newResolvedChallengeTiles = {xValues: [] as number[], yValues: [] as number[]};
      oldResolvedChallengeTiles.xValues.forEach((x, index) => {
        const y = oldResolvedChallengeTiles.yValues[index];
        if (!indicesToRemove.has(positionToIndex({x, y}))) {
          newResolvedChallengeTiles.xValues.push(x);
          newResolvedChallengeTiles.yValues.push(y);
        }
      });
      setComponent(ResolvedChallengeTiles, challengeTilesEntity, newResolvedChallengeTiles);
    }
  }, 1000);

  // Updates pending and resolved challenge tiles when the contract challenge tiles are created, and sets a
  // removal timeout for the resolved challenge tiles
  defineComponentSystem(world, ChallengeTiles, ({entity, value}) => {
    const challengeTiles = value[0];

    if (challengeTiles) {
      // If this challenge tiles entity doesn't have any associated hits (challengeTiles.merkleRoot will be 0),
      // then sets them all to resolved, otherwise sorts the challenge tiles into pending and resolved
      let resolvedChallengeTiles: ChallengeTilesType;
      if (challengeTiles.merkleRoot === '0x00') {
        resolvedChallengeTiles = {xValues: challengeTiles.xValues, yValues: challengeTiles.yValues};
        removeComponent(PendingChallengeTiles, entity);
      } else {
        resolvedChallengeTiles = {xValues: [] as number[], yValues: [] as number[]};
        const pendingChallengeTiles = {xValues: [] as number[], yValues: [] as number[]};

        const parsedMapData = getParsedMapData(MapData);
        challengeTiles.xValues.forEach((x, index) => {
          const y = challengeTiles.yValues[index];

          if (isMapTileJungle(parsedMapData, {x, y})) {
            pendingChallengeTiles.xValues.push(x);
            pendingChallengeTiles.yValues.push(y);
          } else {
            resolvedChallengeTiles.xValues.push(x);
            resolvedChallengeTiles.yValues.push(y);
          }
        });

        setComponent(PendingChallengeTiles, entity, pendingChallengeTiles);
      }
      setComponent(ResolvedChallengeTiles, entity, resolvedChallengeTiles);
      createChallengeTilesExpiryTimeout(entity, resolvedChallengeTiles);
    } else {
      // Resolve and set expiry for any pending tiles that are left when the contract challenge tiles are
      // destroyed
      const pendingChallengeTiles = getComponentValue(PendingChallengeTiles, entity);
      if (pendingChallengeTiles) {
        const oldResolvedChallengeTiles = getComponentValue(ResolvedChallengeTiles, entity);
        setComponent(ResolvedChallengeTiles, entity, {
          xValues: [...(oldResolvedChallengeTiles?.xValues ?? []), ...pendingChallengeTiles.xValues],
          yValues: [...(oldResolvedChallengeTiles?.yValues ?? []), ...pendingChallengeTiles.yValues],
        });
        removeComponent(PendingChallengeTiles, entity);
        createChallengeTilesExpiryTimeout(entity, pendingChallengeTiles);
      }
    }
  });

  // TODO make it so that the client can't submit any actions for an entity if there are pending
  // challenges for it VVV

  // Handles the search response when a new pending challenge is registered, as well
  // as resolving pending challenge tiles if all pending challenges for the challenge tiles entity
  // are removed. Also listens for pending challenges being removed, to see if the corresponding
  // search result is intended for the local player
  defineComponentSystem(world, PendingChallenges, ({entity, value}) => {
    const currIDs = value[0]?.value ?? [];
    const prevIDs = value[1]?.value ?? [];

    // Assumes that the pending challenges array can only change by a single element at a time
    if (currIDs.length > prevIDs.length) {
      if (hasComponent(LocallyControlled, entity)) {
        // Because the pending challenges are created before the challenge tiles entity
        // contract-side (for good reason), the world.getEntityIndexStrict() will fail unless put
        // into a timeout with length 0, to allow the update to ChallengeTiles to be processed first
        setTimeout(() => {
          // A newly added id will always be at the end
          const challengeTilesEntityID = lastElementOf(currIDs) as EntityID;
          const challengeTilesEntityIndex = world.getEntityIndexStrict(challengeTilesEntityID);
          const challengeTiles = getComponentValueStrict(ChallengeTiles, challengeTilesEntityIndex);
          const entityPosition = getComponentValueStrict(LocalPosition, entity);

          let wasHit = false;
          challengeTiles.xValues.forEach((x, index) => {
            if (coordsEq(entityPosition, {x, y: challengeTiles.yValues[index]})) {
              wasHit = true;
            }
          });

          // If the entity was hit encrypts the actual position commitment nonce,
          // otherwise encrypts 0
          const positionCommitmentNonce = getComponentValueStrict(Nonce, entity).value;
          const secretNonce = wasHit ? positionCommitmentNonce : 0;

          const sharedKey = calculateSharedKey(PrivateKey, PublicKey, challengeTiles.challenger);
          const encryptionNonce = getRandomNonce();
          const encryptedSecretNonce = encryptSecretNonce(secretNonce, sharedKey, encryptionNonce);

          const senderAddress = connectedAddress.get() as string;
          const receiverAddress = challengeTiles.challenger;

          searchResponseProver({
            ...entityPosition,
            ...getSearchResponseProofInputs(PrivateKey, PublicKey, senderAddress, receiverAddress),
            positionCommitmentNonce,
            secretNonce,
            challengeTilesXValues: challengeTiles.xValues,
            challengeTilesYValues: challengeTiles.yValues,
            encryptedSecretNonce,
            encryptionNonce,
          }).then(({proofData}) => {
            const entityID = world.entities[entity];
            searchRespond(
              entityID, challengeTilesEntityID, encryptedSecretNonce, encryptionNonce, proofData
            );
          });
        }, 0);
      }
    } else if (!hasComponent(Dead, entity)) {
      // If the pending challenge has been removed as a result of the entity dying, don't attempt to
      // decrypt the search result
      const challengeTilesEntityID = difference(prevIDs, currIDs)[0] as EntityID;
      const challengeTilesEntityIndex = world.getEntityIndexStrict(challengeTilesEntityID);
      const challengeTiles = getComponentValueStrict(ChallengeTiles, challengeTilesEntityIndex);

      // Only attempt decryption of the search result if it was in response to a challenge made by
      // the local player
      if (challengeTiles.challenger.toLocaleLowerCase() === connectedAddress.get()) {
        const searchResult = getComponentValueStrict(SearchResult, entity);
        const publicKeyOwner = getComponentValueStrict(ControlledBy, entity).value;
        const sharedKey = calculateSharedKey(PrivateKey, PublicKey, publicKeyOwner);
        const secretNonce = decryptSecretNonce(
          searchResult.encryptedSecretNonce.map(val => BigInt(val)),
          sharedKey,
          parseInt(searchResult.encryptionNonce)
        );

        // Does a search to find which of the player's potential positions the revealed nonce
        // corresponds to (if it corresponds to any at all)
        const potentialPositions = getComponentValueStrict(PotentialPositions, entity);
        const positionCommitment = BigInt(getComponentValueStrict(PositionCommitment, entity).value);
        let entityPosition: Coord | undefined = undefined;
        for (let i = 0; i < potentialPositions.xValues.length; ++i) {
          const position = {x: potentialPositions.xValues[i], y: potentialPositions.yValues[i]};
          if (poseidon(position.x, position.y, secretNonce) === positionCommitment) {
            entityPosition = position;
            break;
          }
        }

        if (entityPosition) {
          setComponent(LocalPosition, entity, entityPosition);
          setComponent(LocalJungleMoveCount, entity, {value: 1});
          setComponent(LastKnownPositions, entity, {
            xValues: [entityPosition.x], yValues: [entityPosition.y]
          });
        } else {
          console.log(
            'Decrypted nonce didn\'t match any of the unit\'s potential positions, must have missed'
          );
        }
      }
    }
  });

  // Handles drawing and removal of resolved challenge tiles sprites
  defineComponentSystem(world, ResolvedChallengeTiles, ({entity, value}) => {
    drawTileSprites(
      Main, entity, 'ResolvedChallengeTiles', value[0], value[1], Sprites.Eye,
      {alpha: 0.6, tint: 0xff0000}
    );
  });
}
