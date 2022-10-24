pragma circom 2.0.9;

include "../../../../node_modules/circomlib/circuits/bitify.circom";
include "../../../../node_modules/circomlib/circuits/comparators.circom";
include "./calcMerkleRoot.circom";
include "./calculateTotal.circom";

// Returns whether the supplied `value` is equal to any of the values in `equalTo`.
// `count` determines how many values are in the set
template IsEqualToAny(count) {
    signal input value;
    signal input equalTo[count];

    signal output out;

    component calculateTotal = CalculateTotal(count);
    component isEquals[count];
    for (var i = 0; i < count; i++) {
        isEquals[i] = IsEqual();
        isEquals[i].in[0] <== value;
        isEquals[i].in[1] <== equalTo[i];
        calculateTotal.in[i] <== isEquals[i].out;
    }

    out <== calculateTotal.out;
}

// TODO need to audit this shit bruhhhhhhhhhh
template IntegerDivision(divisor) {
    signal input in;

    signal output quotient;
    signal output remainder;

    quotient <-- in \ divisor;
    remainder <-- in % divisor;
    in === quotient * divisor + remainder;

    // TODO need to properly audit the below (especially whether lessThan 
    // works correctly here, and is enough (need greaterThan check too?))
    //
    // Explanation: Bruhhhhhh
    component lessThan = LessThan(252); // 252 max for circuit
    
    // Maybe this works??? Maybe need greaterThan also??? 
    // Maybe also check that the remainder is less than divisor??
    lessThan.in[0] <== in - quotient * divisor;
    lessThan.in[1] <== divisor;
    lessThan.out === 1;
}

// Selects the value of the bit at position `index` within `selectFrom`
template SelectBit() {
    signal input selectFrom;
    signal input index;

    signal output out;

    // Only 253 'useful' bits in a field element
    var usefulBits = 253;

    component num2Bits = Num2Bits(usefulBits);
    num2Bits.in <== selectFrom;
    component calculateTotal = CalculateTotal(usefulBits);
    component isEquals[usefulBits];

    for (var i = 0; i < usefulBits; i++) {
        isEquals[i] = IsEqual();
        isEquals[i].in[0] <== index;
        isEquals[i].in[1] <== i;

        calculateTotal.in[i] <== num2Bits.out[i] * isEquals[i].out;
    }

    out <== calculateTotal.out;
}

// A merkle tree where every leaf is a field element, and each leaf contains
// some number of segments of bit length `bitsPerSegment`
// Assumes that `segmentIndex` is already trusted
template MerkleDataAccess(merkleTreeDepth, bitsPerSegment) {
    signal input segmentIndex; // The global segment index
    signal input dataLeaf; // The leaf that the segment resides in
    signal input merkleSiblings[merkleTreeDepth]; // Each sibling along the path
    signal input merkleRoot; // The root of the merkle tree

    signal output out;

    // The max number of segments that can fit into a field element 
    // (only can fit 253 'useful' bits)
    var segmentsPerLeaf = 253 \ bitsPerSegment;
    assert(bitsPerSegment <= 253);  

    component integerDivision = IntegerDivision(segmentsPerLeaf);
    integerDivision.in <== segmentIndex;
    signal leafIndex <== integerDivision.quotient;

    // The local index of the segment within the leaf
    signal localSegmentIndex <== integerDivision.remainder;

    // Checks the supplied dataLeaf and merkleSiblings against the merkleRoot
    component calcMerkelRoot = CalcMerkelRoot(merkleTreeDepth);
    calcMerkelRoot.leaf <== dataLeaf;
    calcMerkelRoot.leafIndex <== leafIndex;
    for (var i = 0; i < merkleTreeDepth; i++) {
        calcMerkelRoot.merkleSiblings[i] <== merkleSiblings[i];
    }
    calcMerkelRoot.out === merkleRoot;

    var usefulBitCount = bitsPerSegment * segmentsPerLeaf;
    component dataSum = CalculateTotal(usefulBitCount);
    component leafBits = Num2Bits(usefulBitCount);
    leafBits.in <== dataLeaf;

    component isEqualToAnys[usefulBitCount];
    for (var bitIndex = 0; bitIndex < usefulBitCount; bitIndex++) {
        isEqualToAnys[bitIndex] = IsEqualToAny(bitsPerSegment);
        for (var i = 0; i < bitsPerSegment; i++) {
            // The bit index of the first bit in the segment + i
            isEqualToAnys[bitIndex].equalTo[i] <== localSegmentIndex * bitsPerSegment + i;
        }

        // The power of two for the 'local' bit index (bitIndex % bitsPerSegment),
        // that when multiplied by the current bit and summed, will result in the 
        // integer value of the segment, converted from binary 
        var powerOfTwo = 2 ** (bitIndex % bitsPerSegment);
        isEqualToAnys[bitIndex].value <== bitIndex;
        var bitValue = powerOfTwo * leafBits.out[bitIndex];
        dataSum.in[bitIndex] <== bitValue * isEqualToAnys[bitIndex].out;
    }

    out <== dataSum.out;
}

// TODO audit this shit bruhhhhhhhhhhhhhhh
// The same as above but for a single bit rather than a segment
template MerkleDataBitAccess(merkleTreeDepth) {
    signal input bitIndex; // The global bit index
    signal input dataLeaf; // The leaf that the bit resides in
    signal input merkleSiblings[merkleTreeDepth]; // Each sibling along the path
    signal input merkleRoot; // The root of the merkle tree

    signal output out;

    // Field element can only fit 253 'useful' bits
    var bitsPerLeaf = 253;

    component integerDivision = IntegerDivision(bitsPerLeaf);
    integerDivision.in <== bitIndex;
    signal leafIndex <== integerDivision.quotient;

    // The local index of the bit within the leaf
    signal localBitIndex <== integerDivision.remainder;

    // Checks the supplied dataLeaf and merkleSiblings against the merkleRoot
    component calcMerkelRoot = CalcMerkelRoot(merkleTreeDepth);
    calcMerkelRoot.leaf <== dataLeaf;
    calcMerkelRoot.leafIndex <== leafIndex;
    for (var i = 0; i < merkleTreeDepth; i++) {
        calcMerkelRoot.merkleSiblings[i] <== merkleSiblings[i];
    }
    calcMerkelRoot.out === merkleRoot;

    component selectBit = SelectBit();
    selectBit.selectFrom <== dataLeaf;
    selectBit.index <== localBitIndex;

    out <== selectBit.out;
}
