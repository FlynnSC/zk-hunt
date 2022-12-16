pragma circom 2.1.2;

include "../../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../../node_modules/circomlib/circuits/gates.circom";
include "calcMerkleRoot.circom";
include "calcSum.circom";
include "isEqualToAny.circom";

// Returns whether the supplied value is included in the set, and well as the set merkle chain root
template SetInclusion(setSize) {
    signal input value, setValues[setSize];

    signal output out, setMerkleChainRoot;

    // Calculates and outputs the set merkle chain root
    setMerkleChainRoot <== CalcMerkleChainRoot(setSize)(setValues);

    // Calculates and outputs whether the supplied value is part of the set
    out <== IsEqualToAny(setSize)(value, setValues);
}

// Returns whether the supplied (x, y) is included in the coord set, and well as the set merkle 
// chain root
template CoordSetInclusion(setSize) {
    signal input x, y;
    signal input setXValues[setSize], setYValues[setSize];

    signal output out, setMerkleChainRoot;

    // Calculates and outputs the set merkle chain root
    setMerkleChainRoot <== CalcCoordsMerkleChainRoot(setSize)(setXValues, setYValues);

    // Calculates and outputs whether the supplied (x, y) is part of the coord set
    signal isXEquals[setSize];
    signal isYEquals[setSize];
    component equalitySum = CalcSum(setSize);
    for (var i = 0; i < setSize; i++) {
        isXEquals[i] <== IsEqual()([x, setXValues[i]]);
        isYEquals[i] <== IsEqual()([y, setYValues[i]]);
        equalitySum.in[i] <== AND()(isXEquals[i], isYEquals[i]);
    }

    out <== equalitySum.out;
}
