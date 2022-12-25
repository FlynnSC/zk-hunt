import {PhaserLayer} from '../../types';
import {EntityIndex, getComponentValue, getComponentValueStrict, removeComponent, setComponent} from '@latticexyz/recs';
import {coordsEq, positionToIndex} from '../../../../utils/coords';
import {ComponentValueFromComponent} from '../../../../utils/misc';
import {
  calculateSharedKey,
  getPrivateKey,
  getPublicKey,
  poseidon,
  poseidonDecrypt,
  poseidonEncrypt
} from '../../../../utils/secretSharing';
import {Coord} from '@latticexyz/utils';
import {NetworkLayer} from '../../../network';
import {getRandomNonce} from '../../../../utils/random';

type ChallengeTilesType = ComponentValueFromComponent<PhaserLayer['components']['PotentialChallengeTiles']>;

export function resolveChallengeTiles(
  phaser: PhaserLayer, challengeTilesEntity: EntityIndex,
  resolvedChallengeTiles?: ChallengeTilesType, pendingChallengeTiles?: ChallengeTilesType
) {
  const {components: {PendingChallengeTiles, ResolvedChallengeTiles}} = phaser;

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
    const oldResolvedChallengeTiles = getComponentValueStrict(
      ResolvedChallengeTiles, challengeTilesEntity
    );

    // Remove the component if getting rid of the expiring resolved challenge tiles would make it
    // empty, otherwise just filter out the expiring challenge tiles
    if (oldResolvedChallengeTiles.xValues.length === challengeTilesToExpire.xValues.length) {
      removeComponent(ResolvedChallengeTiles, challengeTilesEntity);
    } else {
      const indicesToRemove = new Set(challengeTilesToExpire.xValues.map((x, index) => (
        positionToIndex({x, y: challengeTilesToExpire.yValues[index]})
      )));
      const updatedResolvedChallengeTiles = {
        xValues: [] as number[],
        yValues: [] as number[],
        challengeType: oldResolvedChallengeTiles.challengeType
      };
      oldResolvedChallengeTiles.xValues.forEach((x, index) => {
        const y = oldResolvedChallengeTiles.yValues[index];
        if (!indicesToRemove.has(positionToIndex({x, y}))) {
          updatedResolvedChallengeTiles.xValues.push(x);
          updatedResolvedChallengeTiles.yValues.push(y);
        }
      });
      setComponent(ResolvedChallengeTiles, challengeTilesEntity, updatedResolvedChallengeTiles);
    }
  }, 1000);
}

export function updateRevealedEntityPosition(phaser: PhaserLayer, entity: EntityIndex, position: Coord) {
  const {components: {LocalPosition, LocalJungleMoveCount, LastKnownPositions}} = phaser;
  setComponent(LocalPosition, entity, position);
  setComponent(LocalJungleMoveCount, entity, {value: 1});
  setComponent(LastKnownPositions, entity, {
    xValues: [position.x], yValues: [position.y]
  });
}

export function attemptNonceDecryption(
  network: NetworkLayer, phaser: PhaserLayer, challengedEntity: EntityIndex
) {
  const {components: {ControlledBy, SearchResult, PublicKey, PositionCommitment}} = network;
  const {components: {PrivateKey, PotentialPositions, PendingHiddenChallengeTilesEntity}} = phaser;

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
      updateRevealedEntityPosition(phaser, challengedEntity, entityPosition);
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
    resolveChallengeTiles(phaser, challengeTilesEntity);
  }
}

export function getConnectedAddress(network: NetworkLayer) {
  return (network.network.connectedAddress.get() as string).toLowerCase();
}

export function getSearchResponseValues(
  network: NetworkLayer, phaser: PhaserLayer, entity: EntityIndex, challenger: string,
  challengeTiles: ChallengeTilesType
) {
  const {components: {PositionCommitment, PublicKey}} = network;
  const {components: {LocalPosition, Nonce, PrivateKey}} = phaser;

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
    responderPublicKey: getPublicKey(PublicKey, getConnectedAddress(network)),
    challengerPublicKey: getPublicKey(PublicKey, challenger),
    cipherText: poseidonEncrypt([secretNonce], sharedKey, encryptionNonce),
    encryptionNonce
  };
}
