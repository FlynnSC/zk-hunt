import {BigNumberish} from 'ethers';

// @ts-ignore
const snarkjsLocal = require('snarkjs');

export function createProver(circuitName: string, isWeb: boolean) {
  const pathPrefix = isWeb ? 'http://localhost:3000/' : './public/';
  const snarkjs = isWeb ? (window as any).snarkjs : snarkjsLocal;

  return async (input: Record<string, BigNumberish>) => {
    const {proof, publicSignals} = await snarkjs.groth16.fullProve(
      input,
      `${pathPrefix}circuits/${circuitName}/circuit.wasm`,
      `${pathPrefix}circuits/${circuitName}/circuit_final.zkey`
    );

    // Adds an outer array to the params string returned from exportSolidityCallData, flattens the
    // parsed nested array structure, removes the public signal values from the end (unneeded)
    const proofData = JSON.parse(
      `[${await snarkjs.groth16.exportSolidityCallData(proof, publicSignals)}]`
    ).flat(2).slice(0, -publicSignals.length);


    return {proofData, publicSignals};
  };
}

