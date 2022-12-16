pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/poseidon.circom";

// Outputs the commitment for the supplied public position and private nonce, where the commitment 
// is checked in the contract
template PositionCommitment() {
    signal input x;
    signal input y;
    signal input nonce;

    signal output out;

    out <== Poseidon(3)([x, y, nonce]);
}

component main {public [x, y]} = PositionCommitment();
