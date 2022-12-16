pragma circom 2.1.2;

include "../../../../node_modules/circomlib/circuits/bitify.circom";
include "./calcSum.circom";

// Returns whether the supplied `value` is equal to any of the values in `equalTo`.
// `count` determines how many values are in the set
template IsEqualToAny(count) {
    signal input value;
    signal input equalTo[count];

    signal output out;

    component equalitySum = CalcSum(count);
    for (var i = 0; i < count; i++) {
        equalitySum.in[i] <== IsEqual()([value, equalTo[i]]);
    }

    out <== equalitySum.out;
}
