pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./utils/setInclusion.circom";

template potentialPositionsReveal(potentialPositionsCount) {
    signal input x, y, nonce, positionCommitment;
    signal input potentialPositionsXValues[potentialPositionsCount];
    signal input potentialPositionsYValues[potentialPositionsCount];
    signal input potentialPositionsCommitment;

    // Checks that the supplied x and y match the commitment
    signal commitment <== Poseidon(3)([x, y, nonce]);
    commitment === positionCommitment;

    // Checks that the passed (x, y) are part of the potential positions, and that they match the 
    // commitment
    signal positionIsIncluded <== CoordSetInclusion(potentialPositionsCount)(
        x, y, potentialPositionsXValues, potentialPositionsYValues, potentialPositionsCommitment
    );
    positionIsIncluded === 1;
}

component main {
    public [positionCommitment, potentialPositionsCommitment]
} = potentialPositionsReveal(4);
