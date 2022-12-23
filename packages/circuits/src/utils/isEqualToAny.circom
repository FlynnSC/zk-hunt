pragma circom 2.1.2;

include "../../../../node_modules/circomlib/circuits/comparators.circom";

// Returns whether the supplied `value` is equal to any of the values in `equalTo`. `count`
// determines how many values are in the set.
// This circuit essentially constructs a polynomial from the values in `equalTo`, and tests to see
// if value is one of the zeroes
template IsEqualToAny(count) {
    signal input value;
    signal input equalTo[count];

    signal output out;

    signal inter[count];
    inter[0] <== value - equalTo[0];
    for (var i = 1; i < count; i++) {
        inter[i] <== (value - equalTo[i]) * inter[i - 1];
    }

    out <== IsZero()(inter[count - 1]);
}
