pragma circom 2.1.2;

include "../../../../node_modules/circomlib/circuits/comparators.circom";
include "calcMerkleRoot.circom";
include "calculateTotal.circom";

// Returns whether the supplied value is included in the set, and well as the set merkle chain root
template SetInclusion(setSize) {
    signal input value;
    signal input setValues[setSize];

    signal output out;
    signal output setMerkleChainRoot;

    // Calculates and outputs the set merkle chain root
    component calcMerkleChainRoot = CalcMerkleChainRoot(setSize);
    for (var i = 0; i < setSize; i++) {
        calcMerkleChainRoot.in[i] <== setValues[i];
    }
    setMerkleChainRoot <== calcMerkleChainRoot.out;

    // Calculates and outputs whether the supplied value is part of the set
    component isEquals[setSize];
    component equalitySum = CalculateTotal(setSize);
    for (var i = 0; i < setSize; i++) {
        isEquals[i] = IsEqual();
        isEquals[i].in[0] <== value;
        isEquals[i].in[1] <== setValues[i];

        equalitySum.in[i] <== isEquals[i].out;
    }

    out <== equalitySum.out;
}

// Returns whether the supplied (x, y) is included in the coord set, and well as the set merkle 
// chain root
template CoordSetInclusion(setSize) {
    signal input x;
    signal input y;
    signal input setXValues[setSize];
    signal input setYValues[setSize];

    signal output out;
    signal output setMerkleChainRoot;

    // Calculates and outputs the set merkle chain root
    component calcCoordsMerkleChainRoot = CalcCoordsMerkleChainRoot(setSize);
    for (var i = 0; i < setSize; i++) {
        calcCoordsMerkleChainRoot.xValues[i] <== setXValues[i];
        calcCoordsMerkleChainRoot.yValues[i] <== setYValues[i];
    }
    setMerkleChainRoot <== calcCoordsMerkleChainRoot.out;

    // Calculates and outputs whether the supplied (x, y) is part of the coord set
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
