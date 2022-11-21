pragma circom 2.0.9;

include "../../../../node_modules/circomlib/circuits/comparators.circom";
include "calcMerkleRoot.circom";
include "calculateTotal.circom";

// TODO turn the merkle tree into a merkle chain, and use this circuit in jungleHitAvoid and 
// potentialPositions reveal

// Returns whether the supplied (x, y) is included in the position set, and well as thd set merkle 
// root
template PositionSetInclusion(setSize) {
    signal input x;
    signal input y;
    signal input setXValues[setSize];
    signal input setYValues[setSize];

    signal output out;
    signal output setMerkleRoot;

    // Calculates and outputs the set merkle root
    component calcMerkleRoot = CalcMerkleRoot(setSize * 2);
    for (var i = 0; i < setSize; i++) {
        calcMerkleRoot.in[2 * i] <== setXValues[i];
        calcMerkleRoot.in[2 * i + 1] <== setYValues[i];
    }
    setMerkleRoot <== calcMerkleRoot.out;

    // Calculates and outputs whether the passed (x, y) are part of the position set
    component isXEquals[setSize];
    component isYEquals[setSize];
    component equalitySum = CalculateTotal(setSize);
    for (var i = 0; i < setSize; i++) {
        isXEquals[i] = IsEqual();
        isXEquals[i].in[0] <== x;
        isXEquals[i].in[1] <== setXValues[i];

        isYEquals[i] = IsEqual();
        isYEquals[i].in[0] <== y;
        isYEquals[i].in[1] <== setYValues[i];

        equalitySum.in[i] <== isXEquals[i].out * isYEquals[i].out;
    }

    out <== equalitySum.out;
}
