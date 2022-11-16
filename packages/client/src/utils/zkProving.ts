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
    const {proof, publicSignals} = await snarkjs.groth16.fullProve(
      input,
      `/circuits/${circuitName}/circuit.wasm`,
      `/circuits/${circuitName}/circuit_final.zkey`
    );

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
