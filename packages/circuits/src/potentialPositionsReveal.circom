pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./utils/calcMerkleRoot.circom";
include "./utils/calculateTotal.circom";

// TODO use coordSetInclusion here + add explanation

template potentialPositionsReveal() {
    signal input x;
    signal input y;
    signal input nonce;
    signal input positionCommitment;

    var potentialPositionsCount = 4;
    signal input potentialPositionsXValues[potentialPositionsCount]; 
    signal input potentialPositionsYValues[potentialPositionsCount]; 

    signal output out;

    // Checks that the supplied x and y match the commitment
    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== x;
    poseidon.inputs[1] <== y;
    poseidon.inputs[2] <== nonce;

    poseidon.out === positionCommitment;

    // Checks that the passed (x, y) are part of the potential positions
    component isXEquals[potentialPositionsCount];
    component isYEquals[potentialPositionsCount];
    component equalitySum = CalculateTotal(potentialPositionsCount);
    for (var i = 0; i < potentialPositionsCount; i++) {
        isXEquals[i] = IsEqual();
        isXEquals[i].in[0] <== x;
        isXEquals[i].in[1] <== potentialPositionsXValues[i];

        isYEquals[i] = IsEqual();
        isYEquals[i].in[0] <== y;
        isYEquals[i].in[1] <== potentialPositionsYValues[i];

        equalitySum.in[i] <== isXEquals[i].out * isYEquals[i].out;
    }

    equalitySum.out === 1;

    // Checks that the provided hit potentialPositions hash to the correct merkle root
    component calcMerkleRoot = CalcMerkleRoot(potentialPositionsCount * 2);
    for (var i = 0; i < potentialPositionsCount; i++) {
        calcMerkleRoot.in[2 * i] <== potentialPositionsXValues[i];
        calcMerkleRoot.in[2 * i + 1] <== potentialPositionsYValues[i];
    }
    out <== calcMerkleRoot.out;
}

component main {public [positionCommitment]} = potentialPositionsReveal();
