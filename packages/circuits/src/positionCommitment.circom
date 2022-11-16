pragma circom 2.0.9;

include "../../../node_modules/circomlib/circuits/poseidon.circom";

// Outputs the commitment for the supplied public position and private nonce, where the commitment 
// is checked in the contract
template PositionCommitment() {
    signal input x;
    signal input y;
    signal input nonce;

    signal output out;

    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== x;
    poseidon.inputs[1] <== y;
    poseidon.inputs[2] <== nonce;

    out <== poseidon.out;
}

component main {public [x, y]} = PositionCommitment();
