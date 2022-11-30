pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./utils/setInclusion.circom";

template jungleHitAvoid() {
    signal input x;
    signal input y;
    signal input nonce;
    signal input positionCommitment;

    var hitTileCount = 4;
    signal input hitTilesXValues[hitTileCount]; 
    signal input hitTilesYValues[hitTileCount]; 

    signal output out;

    // Checks that the supplied x and y match the commitment
    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== x;
    poseidon.inputs[1] <== y;
    poseidon.inputs[2] <== nonce;

    poseidon.out === positionCommitment;

    // Checks that the passed (x, y) aren't part of the hit tiles, and outputs the hit tiles merkle 
    // chain root
    component coordSetInclusion = CoordSetInclusion(hitTileCount);
    coordSetInclusion.x <== x;
    coordSetInclusion.y <== y;
    for (var i = 0; i < hitTileCount; i++) {
        coordSetInclusion.setXValues[i] <== hitTilesXValues[i];
        coordSetInclusion.setYValues[i] <== hitTilesYValues[i];
    }

    coordSetInclusion.out === 0;
    out <== coordSetInclusion.setMerkleChainRoot;
}

component main {public [positionCommitment]} = jungleHitAvoid();

/* INPUT = {
    "x": "1",
    "y": "1",
    "hitTilesXValues": ["1", "2", "3", "4"],
    "hitTilesYValues": ["1", "2", "3", "4"],
    "hitTilesMerkleRoot": "5168259541470977495270285453609119142121589284467539319710003594004292966519"
} */
