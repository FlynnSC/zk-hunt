import {Keypair, PrivKey, PubKey} from 'maci-domainobjs';
// @ts-ignore
import poseidonCipher from './poseidonEncryption/poseidonCipher.js';
import {EntityID, getComponentValueStrict} from '@latticexyz/recs';
import {NetworkLayer} from '../layers/network';
import {PhaserLayer} from '../layers/phaser';
import {getGodIndexStrict} from './entity';
// @ts-ignore
import {buildPoseidon} from 'circomlibjs';

interface PoseidonFnType {
  (inputs: (number | bigint)[]): Uint8Array;

  F: {
    toObject(val: Uint8Array): bigint
  };
}

let poseidonFn: PoseidonFnType;

export function initPoseidon() {
  buildPoseidon().then((val: PoseidonFnType) => {
    poseidonFn = val;
  });
}

export function poseidon(...inputs: (number | bigint)[]) {
  return poseidonFn.F.toObject(poseidonFn(inputs));
}

export function calculateSharedKey(
  privateKeyComponent: PhaserLayer['components']['PrivateKey'],
  publicKeyComponent: NetworkLayer['components']['PublicKey'],
  publicKeyOwner: string
) {
  const privateKey = new PrivKey(BigInt(getComponentValueStrict(
    privateKeyComponent, getGodIndexStrict(privateKeyComponent.world)
  ).value));
  const publicKey = new PubKey(getComponentValueStrict(
    publicKeyComponent,
    publicKeyComponent.world.getEntityIndexStrict(publicKeyOwner.toLowerCase() as EntityID)
  ).value.map(val => BigInt(val)));

  return Keypair.genEcdhSharedKey(
    privateKey,
    publicKey,
  ).map(val => val.valueOf());
}

export function encryptSecretNonce(
  secretNonce: number, sharedKey: bigint[], encryptionNonce: number
) {
  return (
    poseidonCipher.encrypt([secretNonce], sharedKey, encryptionNonce) as string[]
  ).map(val => BigInt(val));
}

export function decryptSecretNonce(
  encryptedSecretNonce: bigint[], sharedKey: bigint[], encryptionNonce: number
) {
  return poseidonCipher.decrypt(encryptedSecretNonce, sharedKey, encryptionNonce, 1);
}

export function getSearchResponseProofInputs(
  privateKeyComponent: PhaserLayer['components']['PrivateKey'],
  publicKeyComponent: NetworkLayer['components']['PublicKey'],
  senderAddress: string,
  receiverAddress: string
) {
  const godIndex = getGodIndexStrict(privateKeyComponent.world);
  const senderPrivateKey = BigInt(getComponentValueStrict(privateKeyComponent, godIndex).value);
  const senderEntity = privateKeyComponent.world.getEntityIndexStrict(
    senderAddress.toLocaleLowerCase() as EntityID
  );
  const receiverEntity = publicKeyComponent.world.getEntityIndexStrict(
    receiverAddress.toLocaleLowerCase() as EntityID
  );
  return {
    senderPrivateKey: new PrivKey(senderPrivateKey).asCircuitInputs(),
    senderPublicKey: getComponentValueStrict(publicKeyComponent, senderEntity).value,
    receiverPublicKey: getComponentValueStrict(publicKeyComponent, receiverEntity).value
  };
}
