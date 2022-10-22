pragma circom 2.0.9;

include "./merkleDataAccess.circom";

template MapDataAccess() {
    signal input x;
    signal input y;

    // See MerkleDataAccess component for signal explanations
    signal input dataLeaf;
    signal input merkleSiblings[merkleTreeDepth];
    signal input merkleRoot;

    signal output out;

    var merkleTreeDepth = 2;
    var bitsPerSegment = 1;
    component merkleDataAccess = MerkleDataAccess(merkleTreeDepth, bitsPerSegment);
    merkleDataAccess.dataLeaf <== dataLeaf;
    for (var i = 0; i < merkleTreeDepth; i++) {
        merkleDataAccess.merkleSiblings[i] <== merkleSiblings[i];
    }
    merkleDataAccess.merkleRoot <== merkleRoot;

    out <== merkleDataAccess.out;
}
