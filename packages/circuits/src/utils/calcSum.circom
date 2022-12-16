pragma circom 2.1.2;

// Returns the sum of all elements passed into `in`. `count` determines how many 
// elements there are
template CalcSum(count) {
    signal input in[count];
    signal output out;

    var sum = 0;
    for (var i = 0; i < count; i++) {
        sum += in[i];
    }

    out <== sum;
}
