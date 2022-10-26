pragma circom 2.0.9;

include "../../../node_modules/circomlib/circuits/poseidon.circom";

// Assumes 8 bit values for x and y coords
// Assumes 15 * 15 grid (225 bits)

// Checks that the supplied commitment matches the public position and private nonce
template JungleEnter() {
    signal input x;
    signal input y;
    signal input nonce;

    signal output commit;

    // Check commitment is correct
    component poseidon = Poseidon(3);

    poseidon.inputs[0] <== x;
    poseidon.inputs[1] <== y;
    poseidon.inputs[2] <== nonce;

    commit <== poseidon.out;
}

component main {public [x, y]} = JungleEnter();
