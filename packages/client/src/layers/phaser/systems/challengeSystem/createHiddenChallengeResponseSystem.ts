import {NetworkLayer} from '../../../network';
import {PhaserLayer} from '../../types';
import {defineComponentSystem, EntityID, getComponentValueStrict, hasComponent, setComponent} from '@latticexyz/recs';
import {createEntity} from '../../../../utils/entity';
import {calcPositionFromChallengeTiles} from '../../../../utils/challengeTiles';
import {calculateSharedKey, entityToFieldElem, poseidonDecrypt} from '../../../../utils/secretSharing';
import {hiddenSearchResponseProver} from '../../../../utils/zkProving';
import {getSingletonComponentValue, getSingletonComponentValueStrict} from '../../../../utils/singletonComponent';
import {ChallengeType} from '../../../network/components/ChallengeTilesComponent';
import {RESPONSE_PERIOD} from '../../../../constants';
import {
  attemptNonceDecryption,
  getSearchResponseValues,
  resolveChallengeTiles,
  updateRevealedEntityPosition
} from './utils';

export function createHiddenChallengeResponseSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    api: {hiddenSearchRespond},
    components: {PublicKey, SearchResult, ControlledBy, HiddenChallenge}
  } = network;

  const {
    components: {
      LocallyControlled, PendingChallengeTiles, PrivateKey, PendingHiddenChallengeTilesEntity,
      Config
    }
  } = phaser;

  // Handles the hidden search response when there is a new hidden challenge submitted that the
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
    const ignoreChallenge = getSingletonComponentValue(Config)?.ignoreChallenge;
    if (challengerLocallyControlled || ignoreChallenge) {
      return;
    }

    // Ignore if the response period has already passed
    if (Date.now() > ((parseInt(hiddenChallenge.creationTimestamp) + RESPONSE_PERIOD) * 1000)) {
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
        yValues: message.slice(4, 8).map(Number),
        challengeType: ChallengeType.SEARCH
      };

      // Calculates the challenger's position based on the challenge tiles
      const challengerPosition = calcPositionFromChallengeTiles(challengeTiles);
      updateRevealedEntityPosition(phaser, challengerEntity, challengerPosition);

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
        const [challengeTilesEntity] = createEntity(world);
        setComponent(PendingChallengeTiles, challengeTilesEntity, challengeTiles);

        // Delays the response if the toggle is set, so that the player can make a move before
        // responding (to highlight the vulnerability in the naive response approach)
        const {delayHiddenChallengeResponse} = getSingletonComponentValueStrict(Config);
        const responseDelay = delayHiddenChallengeResponse ? 2000 : 0;
        setTimeout(() => {
          const searchResponseValues = getSearchResponseValues(
            network, phaser, challengedEntity, challengerAddress, challengeTiles
          );

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
            resolveChallengeTiles(phaser, challengeTilesEntity);
          });
        }, responseDelay);
      }
    }, 0);
  });

  // Attempts to decrypt submitted search results from entities that have a pending hidden challenge
  defineComponentSystem(world, SearchResult, ({entity}) => {
    if (hasComponent(PendingHiddenChallengeTilesEntity, entity)) {
      attemptNonceDecryption(network, phaser, entity);
    }
  });
}
