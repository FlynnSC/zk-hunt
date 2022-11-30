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
    p: bigint;
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

export function poseidonChainRoot(values: (number | bigint)[]) {
  return values.slice(1).reduce((acc, val) => poseidon(acc, val), values[0]);
}

export function offsetToFieldElem(val: number) {
  return val >= 0 ? BigInt(val) : poseidonFn.F.p + BigInt(val);
}

const fieldElemMask = (BigInt(1) << BigInt(253)) - BigInt(1);

export function entityToFieldElem(entity: EntityID) {
  return BigInt(entity) & fieldElemMask;
}

export function testThing() {
  const nullifier = poseidonChainRoot([...[1, 2, 3, 4], ...[5, 6, 7, 8], 9, 11, 12]);
  console.log(nullifier);
}

export function toBigInt(val: any) {
  return BigInt(val);
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
  ).value.map(toBigInt));

  return Keypair.genEcdhSharedKey(
    privateKey,
    publicKey,
  ).map(val => val.valueOf());
}

export function poseidonEncrypt(
  message: (number | bigint)[], sharedKey: bigint[], encryptionNonce: number
) {
  return (
    poseidonCipher.encrypt(message, sharedKey, encryptionNonce) as string[]
  ).map(toBigInt);
}

export function poseidonDecrypt(
  cipherText: (bigint | string)[], sharedKey: bigint[], encryptionNonce: number,
  messageLength: number
) {
  // Poseidon decryption will throw if it is an invalid decryption
  try {
    return (
      poseidonCipher.decrypt(
        cipherText.map(toBigInt), sharedKey, encryptionNonce, messageLength
      ) as string[]
    ).map(toBigInt);
  } catch (e) {
    return undefined;
  }
}

export function getPrivateKey(privateKeyComponent: PhaserLayer['components']['PrivateKey']) {
  const godIndex = getGodIndexStrict(privateKeyComponent.world);
  const privateKeyRaw = BigInt(getComponentValueStrict(privateKeyComponent, godIndex).value);
  return new PrivKey(privateKeyRaw).asCircuitInputs() as bigint;
}

export function getPublicKey(
  publicKeyComponent: NetworkLayer['components']['PublicKey'],
  address: string
) {
  const entityID = address.toLocaleLowerCase() as EntityID;
  const entity = publicKeyComponent.world.getEntityIndexStrict(entityID);
  return getComponentValueStrict(publicKeyComponent, entity).value;
}
