pragma circom 2.1.2;

include "../../../../node_modules/circomlib/circuits/bitify.circom";
include "../../../../node_modules/circomlib/circuits/comparators.circom";
include "./calcMerkleRoot.circom";
include "./calcSum.circom";
include "./isEqualToAny.circom";
include "./selectIndex.circom";
include "./smallRangeCheck.circom";

template IntegerDivision(divisor, maxQuotient) {
    signal input in;

    signal output quotient;
    signal output remainder;

    quotient <-- in \ divisor;
    remainder <-- in % divisor;
    quotient * divisor + remainder === in;

    // Checks that remainder is less than the divisor
    SmallRangeCheck(divisor)(remainder);

    // Checks that the quotient is smaller than the supplied maxQuotient
    SmallRangeCheck(maxQuotient)(quotient);
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
    var maxLeafIndex = 2 ** merkleTreeDepth;
    assert(bitsPerSegment <= 253);

    // First is the index of the leaf, second is the local index of the segment within the leaf
    signal leafIndex, localSegmentIndex;
    (leafIndex, localSegmentIndex) <== IntegerDivision(segmentsPerLeaf, maxLeafIndex)(segmentIndex);

    // Checks the supplied dataLeaf and merkleSiblings against the merkleRoot
    signal calculatedMerkleRoot <== CalcMerkleRootFromPath(merkleTreeDepth)(
        dataLeaf, leafIndex, merkleSiblings
    );
    calculatedMerkleRoot === merkleRoot;

    var usefulBitCount = bitsPerSegment * segmentsPerLeaf;
    component dataSum = CalcSum(usefulBitCount);
    signal leafBits <== Num2Bits(usefulBitCount)(dataLeaf);

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
        var bitValue = powerOfTwo * leafBits[bitIndex];
        dataSum.in[bitIndex] <== bitValue * isEqualToAnys[bitIndex].out;
    }

    out <== dataSum.out;
}

// The same as above but for a single bit rather than a segment
template MerkleDataBitAccess(merkleTreeDepth) {
    signal input bitIndex; // The global bit index
    signal input dataLeaf; // The leaf that the bit resides in
    signal input merkleSiblings[merkleTreeDepth]; // Each sibling along the path
    signal input merkleRoot; // The root of the merkle tree

    signal output out;

    // Field element can only fit 253 'useful' bits
    var bitsPerLeaf = 253;
    var maxLeafIndex = 2 ** merkleTreeDepth;

    // First is the index of the leaf, second is the local index of the bit within the leaf
    signal leafIndex, localBitIndex;
    (leafIndex, localBitIndex) <== IntegerDivision(bitsPerLeaf, maxLeafIndex)(bitIndex);

    // Checks the supplied dataLeaf and merkleSiblings against the merkleRoot
    signal calculatedMerkleRoot <== CalcMerkleRootFromPath(merkleTreeDepth)(
        dataLeaf, leafIndex, merkleSiblings
    );
    calculatedMerkleRoot === merkleRoot;

    out <== SelectIndex(bitsPerLeaf)(Num2Bits(bitsPerLeaf)(dataLeaf), localBitIndex);
}
