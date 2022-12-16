pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./utils/setInclusion.circom";

template jungleHitAvoid(hitTileCount) {
    signal input x, y, nonce, positionCommitment;
    signal input hitTilesXValues[hitTileCount], hitTilesYValues[hitTileCount];

    signal output out;

    // Checks that the supplied x and y match the commitment
    signal commitment <== Poseidon(3)([x, y, nonce]);
    commitment === positionCommitment;

    // Checks that the passed (x, y) aren't part of the hit tiles, and outputs the hit tiles merkle
    // chain root
    signal wasHit, hitTilesMerkleChainRoot;
    (wasHit, hitTilesMerkleChainRoot) <== CoordSetInclusion(hitTileCount)(
        x, y, hitTilesXValues, hitTilesYValues
    );
    wasHit === 0;
    out <== hitTilesMerkleChainRoot;
}

component main {public [positionCommitment]} = jungleHitAvoid(4);

/* INPUT = {
    "x": "1",
    "y": "1",
    "hitTilesXValues": ["1", "2", "3", "4"],
    "hitTilesYValues": ["1", "2", "3", "4"],
    "hitTilesMerkleRoot": "5168259541470977495270285453609119142121589284467539319710003594004292966519"
} */
