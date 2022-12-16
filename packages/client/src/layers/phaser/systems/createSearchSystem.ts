import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {
  defineComponentSystem,
  EntityID,
  EntityIndex,
  getComponentValue,
  getComponentValueStrict,
  Has,
  hasComponent,
  removeComponent,
  runQuery,
  setComponent
} from '@latticexyz/recs';
import {angleTowardPosition, coordsEq, positionToIndex} from '../../../utils/coords';
import {drawTileSprites} from '../../../utils/drawing';
import {createEntity, getEntityWithComponentValue} from '../../../utils/entity';
import {isMapTileJungle} from '../../../utils/mapData';
import {Coord} from '@latticexyz/utils';
import {ComponentValueFromComponent, lastElementOf} from '../../../utils/misc';
import {calcPositionFromChallengeTiles, spearHitTileOffsetList} from '../../../utils/hitTiles';
import {Sprites} from '../constants';
import {
  calculateSharedKey,
  entityToFieldElem,
  getPrivateKey,
  getPublicKey,
  offsetToFieldElem,
  poseidon,
  poseidonChainRoot,
  poseidonDecrypt,
  poseidonEncrypt,
  toBigInt
} from '../../../utils/secretSharing';
import {
  hiddenSearchLiquidationProver,
  hiddenSearchProver,
  hiddenSearchResponseProver,
  searchResponseProver
} from '../../../utils/zkProving';
import {getRandomNonce} from '../../../utils/random';
import {difference} from 'lodash';
import {getSingletonComponentValue, getSingletonComponentValueStrict} from '../../../utils/singletonComponent';

// TODO refactor to remove the duplicate functionality between this and the attack system?

export function createSearchSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    network: {connectedAddress},
    api: {search, searchRespond, hiddenSearch, hiddenSearchRespond, hiddenSearchLiquidate},
    components: {
      ChallengeTiles, PendingChallenges, PositionCommitment, JungleMoveCount, PublicKey,
      SearchResult, ControlledBy, Dead, HiddenChallenge, NullifierQueue
    }
  } = network;

  const {
    scenes: {Main},
    components: {
      LocalPosition, LocallyControlled, Nonce, CursorTilePosition, PrimingSearch, ParsedMapData,
      PotentialChallengeTiles, PendingChallengeTiles, ResolvedChallengeTiles, ActionSourcePosition,
      PotentialPositions, PrivateKey, LocalJungleMoveCount, LastKnownPositions,
      PendingHiddenChallengeTilesEntity, Config
    }
  } = phaser;

  const getConnectedAddress = () => (connectedAddress.get() as string).toLowerCase();

  const getAttackDirectionIndex = (actionSourcePosition: Coord) => {
    const cursorPosition = getSingletonComponentValue(CursorTilePosition);
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

  // Returns the first entity found (if one exists) whose potential positions overlap with the
  // current potential challenge tiles
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

  // TODO split this logic up into multiple files man

  // TODO prevent creating a new challenge if there is already one pending?

  // Updates the pending and resolved pending tiles, and sets an expiry for the resolved tiles
  const resolveChallengeTiles = (
    challengeTilesEntity: EntityIndex, resolvedChallengeTiles?: ChallengeTilesType,
    pendingChallengeTiles?: ChallengeTilesType
  ) => {
    // If no resolvedChallengeTiles are passed, just uses the pending challenge tiles
    const newResolvedChallengeTiles = resolvedChallengeTiles ?? getComponentValueStrict(
      PendingChallengeTiles, challengeTilesEntity
    );
    if (pendingChallengeTiles) {
      setComponent(PendingChallengeTiles, challengeTilesEntity, pendingChallengeTiles);
    } else {
      removeComponent(PendingChallengeTiles, challengeTilesEntity);
    }
    setComponent(ResolvedChallengeTiles, challengeTilesEntity, newResolvedChallengeTiles);

    // Creates resolved tiles expiry
    setTimeout(() => {
      const challengeTilesToExpire = newResolvedChallengeTiles;
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
  };

  // Handles submission of a search/hidden search, and converting potential challenge tiles to
  // pending challenge tiles
  Main.input.click$.subscribe(() => {
    const challengerEntity = getEntityWithComponentValue(PrimingSearch);
    if (!challengerEntity) return;

    const actionSourcePosition = getComponentValueStrict(ActionSourcePosition, challengerEntity);
    const directionIndex = getAttackDirectionIndex(actionSourcePosition);

    if (directionIndex === undefined) return;

    const [challengeTilesEntity, challengeTilesEntityID] = createEntity(world);

    // Either performs a hidden search from the jungle, or a normal search from the plains
    if (hasComponent(JungleMoveCount, challengerEntity)) {
      const challengedEntityIndex = getPotentiallyFoundEntity(challengerEntity);
      if (challengedEntityIndex !== undefined) {
        const responderAddress = getComponentValueStrict(ControlledBy, challengedEntityIndex).value;
        const offsetList = spearHitTileOffsetList[directionIndex];
        const challengeTilesOffsetsXValues = offsetList.map(([x]) => x);
        const challengeTilesOffsetsYValues = offsetList.map(([, y]) => y);

        const challengerPrivateKey = getPrivateKey(PrivateKey);
        const challengerPublicKey = getPublicKey(PublicKey, getConnectedAddress());
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

                resolveChallengeTiles(challengeTilesEntity);
              });
            }
          }, 12000); // 12 seconds, 10 seconds is the response period
        });
      } else {
        // Converts the pending challenge tiles to resolved even though no transaction was submitted
        setTimeout(() => resolveChallengeTiles(challengeTilesEntity), 1000);
      }
    } else {
      search(world.entities[challengerEntity], challengeTilesEntityID, directionIndex);
    }

    const potentialChallengeTiles = getComponentValueStrict(PotentialChallengeTiles, challengerEntity);
    removeComponent(PrimingSearch, challengerEntity);
    setComponent(PendingChallengeTiles, challengeTilesEntity, potentialChallengeTiles);
  });

  type ChallengeTilesType = ComponentValueFromComponent<typeof PendingChallengeTiles>;

  // Updates pending and resolved challenge tiles when the contract challenge tiles are created, and
  // sets a removal timeout for the resolved challenge tiles
  defineComponentSystem(world, ChallengeTiles, ({entity, value}) => {
    const challengeTiles = value[0];

    if (challengeTiles) {
      // If this challenge tiles entity doesn't have any associated hits (challengeTiles.merkleChainRoot will be 0),
      // then sets them all to resolved, otherwise sorts the challenge tiles into pending and resolved
      if (challengeTiles.merkleChainRoot === '0x00') {
        resolveChallengeTiles(entity, challengeTiles);
      } else {
        const resolvedChallengeTiles = {xValues: [] as number[], yValues: [] as number[]};
        const pendingChallengeTiles = {xValues: [] as number[], yValues: [] as number[]};

        challengeTiles.xValues.forEach((x, index) => {
          const y = challengeTiles.yValues[index];

          if (isMapTileJungle(ParsedMapData, {x, y})) {
            pendingChallengeTiles.xValues.push(x);
            pendingChallengeTiles.yValues.push(y);
          } else {
            resolvedChallengeTiles.xValues.push(x);
            resolvedChallengeTiles.yValues.push(y);
          }
        });

        resolveChallengeTiles(entity, resolvedChallengeTiles, pendingChallengeTiles);
      }
    } else {
      // Resolve and set expiry for any pending tiles that are left when the contract challenge tiles are
      // destroyed
      const pendingChallengeTiles = getComponentValue(PendingChallengeTiles, entity);
      if (pendingChallengeTiles) {
        const oldResolvedChallengeTiles = getComponentValue(ResolvedChallengeTiles, entity);
        resolveChallengeTiles(entity, {
          xValues: [...(oldResolvedChallengeTiles?.xValues ?? []), ...pendingChallengeTiles.xValues],
          yValues: [...(oldResolvedChallengeTiles?.yValues ?? []), ...pendingChallengeTiles.yValues]
        });
      }
    }
  });

  // TODO make it so that the client can't submit any actions for an entity if there are pending
  // challenges for it VVV

  const getSearchResponseValues = (
    entity: EntityIndex, challenger: string, challengeTiles: ChallengeTilesType
  ) => {
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
    const positionCommitment = getComponentValueStrict(PositionCommitment, entity).value;
    const encryptionNonce = getRandomNonce();
    const sharedKey = calculateSharedKey(PrivateKey, PublicKey, challenger);

    return {
      ...entityPosition,
      positionCommitmentNonce,
      positionCommitment,
      responderPrivateKey: getPrivateKey(PrivateKey),
      secretNonce,
      challengeTilesXValues: challengeTiles.xValues,
      challengeTilesYValues: challengeTiles.yValues,
      responderPublicKey: getPublicKey(PublicKey, getConnectedAddress()),
      challengerPublicKey: getPublicKey(PublicKey, challenger),
      cipherText: poseidonEncrypt([secretNonce], sharedKey, encryptionNonce),
      encryptionNonce
    };
  };

  const updateRevealedEntityPosition = (entity: EntityIndex, position: Coord) => {
    setComponent(LocalPosition, entity, position);
    setComponent(LocalJungleMoveCount, entity, {value: 1});
    setComponent(LastKnownPositions, entity, {
      xValues: [position.x], yValues: [position.y]
    });
  };

  const attemptNonceDecryption = (challengedEntity: EntityIndex) => {
    const searchResult = getComponentValueStrict(SearchResult, challengedEntity);
    const publicKeyOwner = getComponentValueStrict(ControlledBy, challengedEntity).value;
    const sharedKey = calculateSharedKey(PrivateKey, PublicKey, publicKeyOwner);
    const message = poseidonDecrypt(
      searchResult.cipherText,
      sharedKey,
      parseInt(searchResult.encryptionNonce),
      1 // Message only contains secret nonce
    );

    // Ignore if the decryption is invalid (message for someone else)
    if (!message) return;

    const secretNonce = message[0];
    let challengeDismissed = false;
    if (secretNonce === BigInt(0)) {
      challengeDismissed = true;
      console.log('Decrypted nonce as 0, challenge missed');
    } else {
      // Does a search to find which of the player's potential positions the revealed nonce
      // corresponds to (if it corresponds to any at all)
      const potentialPositions = getComponentValueStrict(PotentialPositions, challengedEntity);
      const positionCommitment = BigInt(getComponentValueStrict(PositionCommitment, challengedEntity).value);
      let entityPosition: Coord | undefined = undefined;
      for (let i = 0; i < potentialPositions.xValues.length; ++i) {
        const position = {x: potentialPositions.xValues[i], y: potentialPositions.yValues[i]};
        if (poseidon(position.x, position.y, secretNonce) === positionCommitment) {
          entityPosition = position;
          break;
        }
      }

      if (entityPosition) {
        challengeDismissed = true;
        updateRevealedEntityPosition(challengedEntity, entityPosition);
      } else {
        console.error('Decrypted nonce didn\'t match any of the unit\'s potential positions');
      }
    }

    // If the challenge was dismissed and it was a hidden challenge, resolve the tiles and set an
    // expiry
    const challengeTilesEntity = getComponentValue(
      PendingHiddenChallengeTilesEntity, challengedEntity
    )?.value as EntityIndex;
    if (challengeDismissed && challengeTilesEntity !== undefined) {
      removeComponent(PendingHiddenChallengeTilesEntity, challengedEntity);
      resolveChallengeTiles(challengeTilesEntity);
    }
  };

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

          const searchResponseValues = getSearchResponseValues(
            entity, challengeTiles.challenger, challengeTiles
          );

          searchResponseProver(searchResponseValues).then(({proofData}) => {
            const entityID = world.entities[entity];
            searchRespond(
              entityID, challengeTilesEntityID, searchResponseValues.cipherText,
              searchResponseValues.encryptionNonce, proofData
            );
          });
        }, 10); // 10 ms, just in case
      }
    } else if (!hasComponent(Dead, entity)) {
      // If the pending challenge has been removed as a result of the entity dying, don't attempt to
      // decrypt the search result
      const challengeTilesEntityID = difference(prevIDs, currIDs)[0] as EntityID;
      const challengeTilesEntityIndex = world.getEntityIndexStrict(challengeTilesEntityID);
      const challengeTiles = getComponentValueStrict(ChallengeTiles, challengeTilesEntityIndex);

      // Only attempt decryption of the search result if it was in response to a challenge made by
      // the local player
      if (challengeTiles.challenger.toLowerCase() === getConnectedAddress()) {
        attemptNonceDecryption(entity);
      }
    }
  });

  // Handles the hidden search response, when there is a new hidden challenge submitted that the
  // local player is able to decrypt
  defineComponentSystem(world, HiddenChallenge, ({value}) => {
    const hiddenChallenge = value[0];
    if (!hiddenChallenge) return;

    // Ignore if the challenge was submitted by the local player
    const challengerEntityID = hiddenChallenge.challengerEntity as EntityID;
    const challengerEntity = world.getEntityIndexStrict(challengerEntityID);
    const challengerLocallyControlled = challengerEntityID && hasComponent(
      LocallyControlled, challengerEntity
    );
    const ignoreHiddenChallenge = getSingletonComponentValue(Config)?.ignoreHiddenChallenge;
    if (challengerLocallyControlled || ignoreHiddenChallenge) {
      return;
    }

    // Ignore if the response period has already passed
    if (Date.now() > ((parseInt(hiddenChallenge.creationTimestamp) + 10) * 1000)) {
      console.log('Ignored hidden challenge due to expiry');
      return;
    }

    // Decryption and response logic put into a timeout to ensure that the private key has been
    // hydrated from storage before trying to calculate the shared key
    setTimeout(() => {
      const challengerAddress = getComponentValueStrict(ControlledBy, challengerEntity).value;
      const sharedKey = calculateSharedKey(PrivateKey, PublicKey, challengerAddress);
      const message = poseidonDecrypt(
        hiddenChallenge.cipherText,
        sharedKey,
        parseInt(hiddenChallenge.encryptionNonce),
        10 // 4 * (x, y) + challengedEntity + nullifierNonce
      );

      // Ignore if the decryption was invalid (challenge for someone else)
      if (!message) return;

      const challengeTiles = {
        xValues: message.slice(0, 4).map(Number),
        yValues: message.slice(4, 8).map(Number)
      };

      // Calculates the challenger's position based on the challenge tiles
      const challengerPosition = calcPositionFromChallengeTiles(challengeTiles);
      updateRevealedEntityPosition(challengerEntity, challengerPosition);

      const challengedEntityFieldElem = message[8];
      const challengedEntityID = world.entities.find(
        entityID => entityToFieldElem(entityID) === challengedEntityFieldElem
      );

      // Ignore if encrypted entity doesn't exists???
      if (!challengedEntityID) return;

      const challengedEntity = world.entityToIndex.get(challengedEntityID);
      const nullifierNonce = message[9];

      // If the challenge was meant for the local player, then the decrypted challengedEntity will be
      // owned by them
      if (challengedEntity !== undefined && hasComponent(LocallyControlled, challengedEntity)) {
        const searchResponseValues = getSearchResponseValues(
          challengedEntity, challengerAddress, challengeTiles
        );

        const [challengeTilesEntity] = createEntity(world);
        setComponent(PendingChallengeTiles, challengeTilesEntity, challengeTiles);
        hiddenSearchResponseProver({
          ...searchResponseValues,
          nullifierNonce: Number(nullifierNonce),
          challengedEntity: challengedEntityFieldElem
        }).then(({proofData, publicSignals}) => {
          const nullifier = publicSignals[0];
          hiddenSearchRespond(
            challengedEntityID, searchResponseValues.cipherText,
            searchResponseValues.encryptionNonce, nullifier, proofData
          );
          resolveChallengeTiles(challengeTilesEntity);
        });
      }
    }, 0);
  });

  // Attempts to decrypt submitted search results from entities that have a pending hidden
  // challenge
  defineComponentSystem(world, SearchResult, ({entity}) => {
    if (hasComponent(PendingHiddenChallengeTilesEntity, entity)) {
      attemptNonceDecryption(entity);
    }
  });

  // Handles drawing and removal of potential challenge tiles sprites
  defineComponentSystem(world, PotentialChallengeTiles, ({entity, value}) => {
    drawTileSprites(
      Main, entity, 'PotentialChallengeTiles', value[0], value[1], Sprites.Eye, {alpha: 0.4}
    );
  });

  // Handles drawing and removal of pending challenge tiles sprites
  defineComponentSystem(world, PendingChallengeTiles, ({entity, value}) => {
    drawTileSprites(
      Main, entity, 'PendingChallengeTiles', value[0], value[1], Sprites.Eye, {alpha: 0.7}
    );
  });

  // Handles drawing and removal of resolved challenge tiles sprites
  defineComponentSystem(world, ResolvedChallengeTiles, ({entity, value}) => {
    drawTileSprites(
      Main, entity, 'ResolvedChallengeTiles', value[0], value[1], Sprites.Eye,
      {alpha: 0.6, tint: 0xff0000}
    );
  });
}
