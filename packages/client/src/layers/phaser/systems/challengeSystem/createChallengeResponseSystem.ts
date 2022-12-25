import {NetworkLayer} from '../../../network';
import {PhaserLayer} from '../../types';
import {
  defineComponentSystem,
  EntityID,
  getComponentValue,
  getComponentValueStrict,
  hasComponent
} from '@latticexyz/recs';
import {coordsEq} from '../../../../utils/coords';
import {isMapTileJungle} from '../../../../utils/mapData';
import {lastElementOf} from '../../../../utils/misc';
import {jungleHitAvoidProver, searchResponseProver} from '../../../../utils/zkProving';
import {difference, pick} from 'lodash';
import {ChallengeType} from '../../../network/components/ChallengeTilesComponent';
import {attemptNonceDecryption, getConnectedAddress, getSearchResponseValues, resolveChallengeTiles} from './utils';

export function createChallengeResponseSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    api: {searchRespond, jungleHitReceive, jungleHitAvoid},
    components: {ChallengeTiles, PendingChallenges, PositionCommitment, Dead}
  } = network;

  const {
    components: {
      LocalPosition, LocallyControlled, Nonce, ParsedMapData, PendingChallengeTiles,
      ResolvedChallengeTiles
    }
  } = phaser;

  // Updates pending and resolved challenge tiles when the contract challenge tiles are created, and
  // sets a removal timeout for the resolved challenge tiles
  defineComponentSystem(world, ChallengeTiles, ({entity, value}) => {
    const challengeTiles = value[0];

    if (challengeTiles) {
      // If this challenge tiles entity doesn't have any associated pending challenges
      // (challengeTiles.merkleChainRoot will be 0), then sets them all to resolved, otherwise sorts
      // the challenge tiles into pending and resolved
      if (challengeTiles.merkleChainRoot === '0x00') {
        resolveChallengeTiles(
          phaser, entity, pick(challengeTiles, ['xValues', 'yValues', 'challengeType'])
        );
      } else {
        const challengeType = challengeTiles.challengeType;
        const resolvedChallengeTiles = {xValues: [] as number[], yValues: [] as number[], challengeType};
        const pendingChallengeTiles = {xValues: [] as number[], yValues: [] as number[], challengeType};

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

        resolveChallengeTiles(phaser, entity, resolvedChallengeTiles, pendingChallengeTiles);
      }
    } else {
      // Resolve and set expiry for any pending tiles that are left when the contract challenge
      // tiles are destroyed
      const pendingChallengeTiles = getComponentValue(PendingChallengeTiles, entity);
      if (pendingChallengeTiles) {
        const oldResolvedChallengeTiles = getComponentValue(ResolvedChallengeTiles, entity);
        resolveChallengeTiles(phaser, entity, {
          xValues: [...(oldResolvedChallengeTiles?.xValues ?? []), ...pendingChallengeTiles.xValues],
          yValues: [...(oldResolvedChallengeTiles?.yValues ?? []), ...pendingChallengeTiles.yValues],
          challengeType: pendingChallengeTiles.challengeType
        });
      }
    }
  });

  // Handles the attack or search response when a new pending challenge is registered
  defineComponentSystem(world, PendingChallenges, ({entity, value}) => {
    const currIDs = value[0]?.value ?? [];
    const prevIDs = value[1]?.value ?? [];

    // Early exit if a pending challenge was removed rather than added, or if the entity isn't
    // locally controlled
    if (currIDs.length < prevIDs.length || !hasComponent(LocallyControlled, entity)) return;

    // Because the pending challenges are created before the challenge tiles entity
    // contract-side (for good reason), the world.getEntityIndexStrict() will fail unless put
    // into a timeout with length 10ms, to allow the update to ChallengeTiles to be processed first
    setTimeout(() => {
      // A newly added id will always be at the end, assumes that the pending challenges array can
      // only increase by a single element at a time
      const challengeTilesEntityID = lastElementOf(currIDs) as EntityID;
      const challengeTilesEntityIndex = world.getEntityIndexStrict(challengeTilesEntityID);
      const challengeTiles = getComponentValueStrict(ChallengeTiles, challengeTilesEntityIndex);

      // Either responds to an attack or a search
      if (challengeTiles.challengeType === ChallengeType.ATTACK) {
        const entityPosition = getComponentValueStrict(LocalPosition, entity);

        let wasHit = false;
        challengeTiles.xValues.forEach((x, index) => {
          if (coordsEq(entityPosition, {x, y: challengeTiles.yValues[index]})) {
            wasHit = true;
          }
        });

        const entityID = world.entities[entity];
        const nonce = getComponentValueStrict(Nonce, entity).value;
        if (wasHit) {
          jungleHitReceive(entityID, challengeTilesEntityID, entityPosition, nonce);
        } else {
          jungleHitAvoidProver({
            ...entityPosition,
            nonce,
            positionCommitment: getComponentValueStrict(PositionCommitment, entity).value,
            hitTilesXValues: challengeTiles.xValues,
            hitTilesYValues: challengeTiles.yValues
          }).then(({proofData}) => {
            jungleHitAvoid(entityID, challengeTilesEntityID, proofData);
          });
        }
      } else {
        const searchResponseValues = getSearchResponseValues(
          network, phaser, entity, challengeTiles.challenger, challengeTiles
        );

        searchResponseProver(searchResponseValues).then(({proofData}) => {
          const entityID = world.entities[entity];
          searchRespond(
            entityID, challengeTilesEntityID, searchResponseValues.cipherText,
            searchResponseValues.encryptionNonce, proofData
          );
        });
      }
    }, 10); // 10ms, just in case
  });

  // Listens for removal of pending search challenges, and attempts nonce decryption if appropriate
  defineComponentSystem(world, PendingChallenges, ({entity, value}) => {
    const currIDs = value[0]?.value ?? [];
    const prevIDs = value[1]?.value ?? [];

    // Early exit if a pending challenge was added rather than removed
    if (currIDs.length > prevIDs.length) return;

    const challengeTilesEntityID = difference(prevIDs, currIDs)[0] as EntityID;
    const challengeTilesEntityIndex = world.getEntityIndexStrict(challengeTilesEntityID);
    const challengeTiles = getComponentValueStrict(ChallengeTiles, challengeTilesEntityIndex);

    // Attempt nonce decryption is the challenged entity is still alive, the challenge is a search,
    // and was created by the local player
    const isChallenger = challengeTiles.challenger.toLowerCase() === getConnectedAddress(network);
    const isSearch = challengeTiles.challengeType === ChallengeType.SEARCH;
    if (!hasComponent(Dead, entity) && isSearch && isChallenger) {
      attemptNonceDecryption(network, phaser, entity);
    }
  });
}
