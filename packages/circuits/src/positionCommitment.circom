pragma circom 2.0.9;

include "../../../node_modules/circomlib/circuits/poseidon.circom";

// TODO create a version of this in utils that can be used by all other circuits that perform the 
// same operation
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
