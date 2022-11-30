pragma circom 2.1.2;

include "../../../../node_modules/circomlib/circuits/bitify.circom";
include "./calculateTotal.circom";

// Returns whether the supplied `value` is equal to any of the values in `equalTo`.
// `count` determines how many values are in the set
template IsEqualToAny(count) {
    signal input value;
    signal input equalTo[count];

    signal output out;

    component equalitySum = CalculateTotal(count);
    component isEquals[count];
    for (var i = 0; i < count; i++) {
        isEquals[i] = IsEqual();
        isEquals[i].in[0] <== value;
        isEquals[i].in[1] <== equalTo[i];
        equalitySum.in[i] <== isEquals[i].out;
    }

    out <== equalitySum.out;
}
