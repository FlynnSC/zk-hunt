pragma circom 2.1.2;

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

template CalcMerkleChainRoot(leafCount) {
    assert(leafCount >= 2);

    signal input in[leafCount];

    signal output out;

    component poseidons[leafCount - 1];
    poseidons[0] = Poseidon(2);
    poseidons[0].inputs[0] <== in[0]; 
    poseidons[0].inputs[1] <== in[1];

    for (var i = 2; i < leafCount; i++) {
        poseidons[i - 1] = Poseidon(2);
        poseidons[i - 1].inputs[0] <== poseidons[i - 2].out; 
        poseidons[i - 1].inputs[1] <== in[i];
    }

    out <== poseidons[leafCount - 2].out;
}

template CalcCoordsMerkleChainRoot(coordCount) {
    assert(coordCount >= 2);

    signal input xValues[coordCount];
    signal input yValues[coordCount];

    signal output out;

    component calcMerkleChainRoot = CalcMerkleChainRoot(2 * coordCount);
    for (var i = 0; i < coordCount; i++) {
        calcMerkleChainRoot.in[i] <== xValues[i];
        calcMerkleChainRoot.in[coordCount + i] <== yValues[i];
    }

    out <== calcMerkleChainRoot.out;
}
