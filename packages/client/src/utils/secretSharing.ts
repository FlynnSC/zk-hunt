import {Keypair, PrivKey, PubKey} from 'maci-domainobjs';
// @ts-ignore
import poseidonCipher from './poseidonEncryption/poseidonCipher.js';
import {EntityID, getComponentValueStrict} from '@latticexyz/recs';
import {NetworkLayer} from '../layers/network';
import {PhaserLayer} from '../layers/phaser';
// @ts-ignore
import {buildPoseidon} from 'circomlibjs';
import {getSingletonComponentValueStrict} from './singletonComponent';
import {challengeTilesOffsetList} from './challengeTiles';

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
  const xValuesSet = [[], [], [], []] as number[][];
  const yValuesSet = [[], [], [], []] as number[][];
  challengeTilesOffsetList.forEach(offsetList => {
    offsetList.forEach((offset, index) => {
      xValuesSet[index].push(offset[0]);
      yValuesSet[index].push(offset[1]);
    });
  });
  console.log(JSON.stringify(xValuesSet));
  console.log(JSON.stringify(yValuesSet));
}

export function toBigInt(val: any) {
  return BigInt(val);
}

export function calculateSharedKey(
  privateKeyComponent: PhaserLayer['components']['PrivateKey'],
  publicKeyComponent: NetworkLayer['components']['PublicKey'],
  publicKeyOwner: string
) {
  const privateKey = new PrivKey(BigInt(getSingletonComponentValueStrict(privateKeyComponent).value));
  const publicKey = new PubKey(getComponentValueStrict(
    publicKeyComponent,
    publicKeyComponent.world.getEntityIndexStrict(publicKeyOwner.toLowerCase() as EntityID)
  ).value.map(toBigInt));

  return Keypair.genEcdhSharedKey(
    privateKey,
    publicKey
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
  const privateKeyRaw = BigInt(getSingletonComponentValueStrict(privateKeyComponent).value);
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
