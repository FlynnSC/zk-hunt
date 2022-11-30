pragma circom 2.1.2;

// Returns the sum of all elements passed into `in`. `count` determines how many 
// elements there are
template CalculateTotal(count) {
    signal input in[count];
    signal output out;

    signal sums[count];
    sums[0] <== in[0];

    for (var i = 1; i < count; i++) {
        sums[i] <== sums[i - 1] + in[i];
    }

    out <== sums[count - 1];
}
