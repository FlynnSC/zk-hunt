pragma circom 2.0.9;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

// Assumes 8 bit values for x and y coords
// Assumes 15 * 15 grid (225 bits)

// Returns the absolute difference between `a` and `b`
template AbsDiff() {
    signal input a;
    signal input b;

    signal output out;

    component lessThan = LessThan(8);
    lessThan.in[0] <== a;
    lessThan.in[1] <== b;
    
    signal inter1 <== lessThan.out * (b - a);
    signal inter2 <== (1 - lessThan.out) * (a - b);
    out <== inter1 + inter2;
}

// This circuit returns the sum of the inputs.
// n must be greater than 0.
// Taken from https://github.com/privacy-scaling-explorations/maci/blob/v1/circuits/circom/trees/calculateTotal.circom
// TODO probably find way to not import this rather than including it directly
template CalculateTotal(n) {
    signal input nums[n];
    signal output sum;

    signal sums[n];
    sums[0] <== nums[0];

    for (var i=1; i < n; i++) {
        sums[i] <== sums[i - 1] + nums[i];
    }

    sum <== sums[n - 1];
}

// Returns the value of the bit at position `index` in the binary 
// representation of `value` (0 or 1)
template BitCheck() {
    signal input value;
    signal input index;

    signal output out;

    component num2Bits = Num2Bits(225);
    num2Bits.in <== value;

    component isZero[225];
    component calculateTotal = CalculateTotal(225);

    for (var i = 0; i < 225; i++) {
        isZero[i] = IsZero();
        isZero[i].in <== index - i;

        // If this is the correct index (i === index, isZero[i].out === 1), 
        // then the value of the bit at this index is added to the total, 
        // otherwise 0 is added regardless of the value of the bit
        calculateTotal.nums[i] <== num2Bits.out[i] * isZero[i].out;
    }

    out <== calculateTotal.sum;
}

// Checks that move is valid (single cell orthogonal onto a jungle tile), and outputs
// the old and new commitments so that they can be checked for validity
template JungleMove() {
    signal input oldX;
    signal input oldY;
    signal input oldNonce;
    signal input newX;
    signal input newY;
    signal input mapData;

    signal output oldCommit;
    signal output newCommit;
    
    // Check that movement is single cell orthogonal
    // (probably need to worry about overflow? Also grid boundary checking) 
    component absXDiff = AbsDiff();
    absXDiff.a <== oldX;
    absXDiff.b <== newX;

    component absYDiff = AbsDiff();
    absYDiff.a <== oldY;
    absYDiff.b <== newY;

    absXDiff.out + absYDiff.out === 1;

    // Check commitments are correct
    component poseidonOld = Poseidon(3);
    component poseidonNew = Poseidon(3);

    poseidonOld.inputs[0] <== oldX;
    poseidonOld.inputs[1] <== oldY;
    poseidonOld.inputs[2] <== oldNonce;
    poseidonNew.inputs[0] <== newX;
    poseidonNew.inputs[1] <== newY;
    poseidonNew.inputs[2] <== oldNonce + 1;

    oldCommit <== poseidonOld.out; // Why are the commits outputs in the df circuits (better performance with fewer public inputs?)
    newCommit <== poseidonNew.out;

    // Check that the new map cell is of type jungle (1)
    component bitCheck = BitCheck();
    bitCheck.value <== mapData;
    bitCheck.index <== newX + 15 * newY; // Array index in flattened grid
    bitCheck.out === 1;
}

component main {public [mapData]} = JungleMove();
