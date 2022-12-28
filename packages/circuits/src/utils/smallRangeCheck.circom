pragma circom 2.1.2;

include "./isEqualToAny.circom";

// Checks that `in` is less than the supplied small (<= 254) `range` value
template SmallRangeCheck(range) {
    signal input in;

    component isEqualToAny = IsEqualToAny(range);
    isEqualToAny.value <== in;
    for (var i = 0; i < range; i++) {
        isEqualToAny.equalTo[i] <== i;
    }

    isEqualToAny.out === 1;
}
