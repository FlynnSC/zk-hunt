pragma circom 2.1.2;

include "../../../../node_modules/circomlib/circuits/comparators.circom";
include "./calcSum.circom";

// Selects the value at position `index` within `values`
template SelectIndex(count) {
    signal input values[count];
    signal input index;

    signal output out;

    component calcSum = CalcSum(count);
    signal isCorrectIndexList[count];
    for (var i = 0; i < count; i++) {
        isCorrectIndexList[i] <== IsEqual()([index, i]);
        calcSum.in[i] <== values[i] * isCorrectIndexList[i];
    }

    out <== calcSum.out;
}
