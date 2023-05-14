pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./utils/setInclusion.circom";

template JungleHitAvoid(hitTileCount) {
    signal input x, y, nonce, positionCommitment;
    signal input hitTilesXValues[hitTileCount], hitTilesYValues[hitTileCount];
    signal input hitTilesCommitment;

    // Checks that the supplied x and y match the commitment
    signal commitment <== Poseidon(3)([x, y, nonce]);
    commitment === positionCommitment;

    // Checks that the passed (x, y) aren't part of the hit tiles, and that the hit tiles match the 
    // supplied hit tiles commitment
    signal wasHit <== CoordSetInclusion(hitTileCount)(
        x, y, hitTilesXValues, hitTilesYValues, hitTilesCommitment
    );
    wasHit === 0;
}

component main {public [positionCommitment, hitTilesCommitment]} = JungleHitAvoid(4);
