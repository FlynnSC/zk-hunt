import {BigNumberish} from 'ethers';

type ProofType = unknown;

type SnarkJs = {
  groth16: {
    fullProve(
      input: Record<string, BigNumberish | BigNumberish[]>,
      circuitWasmPath: string,
      circuitZKeyPath: string): Promise<{proof: ProofType, publicSignals: string[]}>,
    exportSolidityCallData(proof: ProofType, publicSignals: string[]): Promise<string>,
  }
}

function createProver<InputType extends Record<keyof InputType, BigNumberish | BigNumberish[]>>(
  circuitName: string
) {
  const snarkjs = (window as unknown as {snarkjs: SnarkJs}).snarkjs;

  return async (input: InputType) => {
    console.log(`Started generating proof for ${circuitName}`);
    const start = Date.now();
    const {proof, publicSignals} = await snarkjs.groth16.fullProve(
      input,
      `/circuits/${circuitName}/circuit.wasm`,
      `/circuits/${circuitName}/circuit_final.zkey`
    );
    console.log(`Finished generating for ${circuitName}, took ${(Date.now() - start) / 1000}s`);

    // Adds an outer array to the params string returned from exportSolidityCallData, flattens the
    // parsed nested array structure, removes the public signal values from the end (unneeded)
    const proofData: string[] = JSON.parse(
      `[${await snarkjs.groth16.exportSolidityCallData(proof, publicSignals)}]`
    ).flat(2).slice(0, -publicSignals.length);

    return {proofData, publicSignals};
  };
}

type PositionCommitmentProofInput = {x: number, y: number, nonce: number};
export const positionCommitmentProver = createProver<PositionCommitmentProofInput>('positionCommitment');

type JungleMoveProofInput = {
  oldX: number;
  oldY: number;
  oldNonce: number;
  newX: number;
  newY: number;

  mapDataMerkleLeaf: BigNumberish;
  mapDataMerkleSiblings: BigNumberish[];
  mapDataMerkleRoot: BigNumberish;
};
export const jungleMoveProver = createProver<JungleMoveProofInput>('jungleMoveV2');

type JungleHitAvoidProofInput = {
  x: number;
  y: number;
  nonce: number;
  positionCommitment: BigNumberish;

  hitTilesXValues: number[];
  hitTilesYValues: number[];
};
export const jungleHitAvoidProver = createProver<JungleHitAvoidProofInput>('jungleHitAvoid');

type PotentialPositionsRevealProofInput = {
  x: number;
  y: number;
  nonce: number;
  positionCommitment: BigNumberish;

  potentialPositionsXValues: number[];
  potentialPositionsYValues: number[];
};
export const potentialPositionsRevealProver =
  createProver<PotentialPositionsRevealProofInput>('potentialPositionsReveal');

type SearchResponseProofInput = {
  x: number;
  y: number;
  positionCommitmentNonce: number;
  responderPrivateKey: BigNumberish;

  secretNonce: number;
  challengeTilesXValues: number[];
  challengeTilesYValues: number[];

  // Public inputs
  positionCommitment: BigNumberish;
  responderPublicKey: BigNumberish[];
  challengerPublicKey: BigNumberish[];
  cipherText: BigNumberish[];
  encryptionNonce: number;
};
export const searchResponseProver = createProver<SearchResponseProofInput>('searchResponse');

type HiddenSearchProofInput = {
  x: number;
  y: number;
  positionCommitmentNonce: number;
  challengerPrivateKey: BigNumberish;
  responderPublicKey: BigNumberish[];

  // BigNumberish because negative offsets are represented as large field element values
  challengeTilesOffsetsXValues: BigNumberish[];
  challengeTilesOffsetsYValues: BigNumberish[];
  challengedEntity: BigNumberish;
  nullifierNonce: number;

  // Public inputs
  positionCommitment: BigNumberish;
  challengerPublicKey: BigNumberish[];
  cipherText: BigNumberish[];
  encryptionNonce: number;
};
export const hiddenSearchProver = createProver<HiddenSearchProofInput>('hiddenSearch');

type HiddenSearchResponseProofInput = {
  x: number;
  y: number;
  positionCommitmentNonce: number;
  responderPrivateKey: BigNumberish;
  challengerPublicKey: BigNumberish[];
  secretNonce: number;
  challengeTilesXValues: number[];
  challengeTilesYValues: number[];
  nullifierNonce: number;

  // Public inputs
  challengedEntity: BigNumberish;
  positionCommitment: BigNumberish;
  responderPublicKey: BigNumberish[];
  cipherText: BigNumberish[];
  encryptionNonce: number;
};
export const hiddenSearchResponseProver = createProver<HiddenSearchResponseProofInput>('hiddenSearchResponse');

type HiddenSearchLiquidationProofInput = {
  challengerPrivateKey: BigNumberish;
  challengeTilesXValues: BigNumberish[];
  challengeTilesYValues: BigNumberish[];
  nullifierNonce: number;
  nullifierMerkleQueueValues: BigNumberish[];

  // Public inputs
  challengedEntity: BigNumberish;
  responderPublicKey: BigNumberish[];
  challengerPublicKey: BigNumberish[];
  cipherText: BigNumberish[];
  encryptionNonce: number;
  nullifierMerkleQueueRoot: BigNumberish;
};
export const hiddenSearchLiquidationProver = createProver<HiddenSearchLiquidationProofInput>('hiddenSearchLiquidation');
