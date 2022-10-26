pragma circom 2.0.9;

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./utils/calcMerkleRoot.circom";
include "./utils/calculateTotal.circom";
include "./utils/isEqualToAny.circom";

template jungleHitAvoid() {
    signal input x;
    signal input y;

    var hitTileCount = 4;
    signal input hitTilesXValues[hitTileCount]; 
    signal input hitTilesYValues[hitTileCount]; 
    signal input hitTilesMerkleRoot;

    // Checks that the provided hit tiles hash to the correct merkle root
    component calcMerkleRoot = CalcMerkleRoot(hitTileCount * 2);
    for (var i = 0; i < hitTileCount; i++) {
        calcMerkleRoot.in[2 * i] <== hitTilesXValues[i];
        calcMerkleRoot.in[2 * i + 1] <== hitTilesYValues[i];
    }
    calcMerkleRoot.out === hitTilesMerkleRoot;

    // Checks that the passed (x, y) aren't part of the hit tiles
    component isXEquals[hitTileCount];
    component isYEquals[hitTileCount];
    component equalitySum = CalculateTotal(hitTileCount);
    for (var i = 0; i < hitTileCount; i++) {
        isXEquals[i] = IsEqual();
        isXEquals[i].in[0] <== x;
        isXEquals[i].in[1] <== hitTilesXValues[i];

        isYEquals[i] = IsEqual();
        isYEquals[i].in[0] <== y;
        isYEquals[i].in[1] <== hitTilesYValues[i];

        equalitySum.in[i] <== isXEquals[i].out * isYEquals[i].out;
    }

    equalitySum.out === 0;
}

component main {public [hitTilesMerkleRoot]} = jungleHitAvoid();

/* INPUT = {
    "x": "1",
    "y": "1",
    "hitTilesXValues": ["1", "2", "3", "4"],
    "hitTilesYValues": ["1", "2", "3", "4"],
    "hitTilesMerkleRoot": "5168259541470977495270285453609119142121589284467539319710003594004292966519"
} */
