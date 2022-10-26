pragma circom 2.0.9;

include "../../../../node_modules/circomlib/circuits/switcher.circom";
include "../../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../../node_modules/circomlib/circuits/bitify.circom";

// Recursively calculates the merkle root of a binary tree with given `leafCount`
template CalcMerkleRoot(leafCount) {
    signal input in[leafCount];

    signal output out;

    component poseidon = Poseidon(2);
    component calcSubMerkleRoots[2];
    if (leafCount == 2) {
        poseidon.inputs[0] <== in[0];
        poseidon.inputs[1] <== in[1];
    } else {
        for (var i = 0; i < 2; i++) {
            var subLeafCount = leafCount / 2;
            calcSubMerkleRoots[i] = CalcMerkleRoot(subLeafCount);
            for (var j = 0; j < subLeafCount; j++) {
                calcSubMerkleRoots[i].in[j] <== in[subLeafCount * i + j];
            }
            poseidon.inputs[i] <== calcSubMerkleRoots[i].out;
        }    
    }

    out <== poseidon.out;
}

template CalcMerkleRootFromPath(merkleTreeDepth) {
    signal input leaf;
    signal input leafIndex;
    signal input merkleSiblings[merkleTreeDepth];

    signal output out;

    // When decomposing the leafIndex into bits, each bit tells you the order
    // that you need to hash the two current siblings as you ascend the tree 
    component merklePathBits = Num2Bits(merkleTreeDepth);
    merklePathBits.in <== leafIndex;

    component poseidons[merkleTreeDepth];
    component switchers[merkleTreeDepth];
    for (var i = 0; i < merkleTreeDepth; i++) {
        // Uses leaf as original sibling for the first level, then the hash 
        // result of previous level for subsequent levels
        switchers[i] = Switcher();
        if (i == 0) switchers[i].L <== leaf;
        else switchers[i].L <== poseidons[i - 1].out;

        switchers[i].R <== merkleSiblings[i];
        switchers[i].sel <== merklePathBits.out[i];

        poseidons[i] = Poseidon(2);
        poseidons[i].inputs[0] <== switchers[i].outL;
        poseidons[i].inputs[1] <== switchers[i].outR;
    }

    out <== poseidons[merkleTreeDepth - 1].out;
}
