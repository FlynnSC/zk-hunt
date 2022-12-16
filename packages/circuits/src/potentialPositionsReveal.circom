pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./utils/setInclusion.circom";

template potentialPositionsReveal(potentialPositionsCount) {
    signal input x, y, nonce, positionCommitment;
    signal input potentialPositionsXValues[potentialPositionsCount];
    signal input potentialPositionsYValues[potentialPositionsCount];

    signal output out;

    // Checks that the supplied x and y match the commitment
    signal commitment <== Poseidon(3)([x, y, nonce]);
    commitment === positionCommitment;

    // Checks that the passed (x, y) are part of the potential positions
    signal positionIsIncluded, merkleChainRoot;
    (positionIsIncluded, merkleChainRoot) <== CoordSetInclusion(potentialPositionsCount)(
        x, y, potentialPositionsXValues, potentialPositionsYValues
    );
    positionIsIncluded === 1;

    out <== merkleChainRoot;
}

component main {public [positionCommitment]} = potentialPositionsReveal(4);
