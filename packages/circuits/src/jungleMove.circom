pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./utils/merkleDataAccess.circom";
include "./utils/isEqualToAny.circom";

// Ensures that the absolute diff between old and new is 1 or 0, and returns whether it is 1. Also
// ensures that the new value is within the map
template CheckDiff(mapSize) {
    signal input old;
    signal input new;

    signal output out;

    signal diff <== old - new;

    out <== IsEqualToAny(2)(diff, [1, -1]);

    // Ensures that the absolute diff is 1 or 0
    signal isZero <== IsZero()(diff);
    out + isZero === 1;

    // Ensures that the new value is not outside the map
    signal isOutsideMap <== IsEqualToAny(2)(new, [-1, mapSize]);
    isOutsideMap === 0;
}

// Checks that move is valid (single cell orthogonal onto a jungle tile within map), and outputs
// the old and new commitments so that they can be checked for validity
template JungleMove(mapSize, merkleTreeDepth) {
    signal input oldX, oldY, oldNonce;
    signal input newX, newY;

    // See MerkleDataBitAccess component for signal explanations
    signal input mapDataMerkleLeaf, mapDataMerkleSiblings[merkleTreeDepth], mapDataMerkleRoot;

    signal output oldCommit, newCommit;

    // Check that movement is single cell orthogonal, and stays within the map
    signal xDiff <== CheckDiff(mapSize)(oldX, newX);
    signal yDiff <== CheckDiff(mapSize)(oldY, newY);
    xDiff + yDiff === 1;

    // Check that the new map cell is of type jungle (1)
    signal bitIndex <== newX + newY * mapSize;
    signal tileType <== MerkleDataBitAccess(merkleTreeDepth)(
        bitIndex, mapDataMerkleLeaf, mapDataMerkleSiblings, mapDataMerkleRoot
    );
    tileType === 1;

    // Check commitments are correct
    oldCommit <== Poseidon(3)([oldX, oldY, oldNonce]);
    newCommit <== Poseidon(3)([newX, newY, oldNonce + 1]);
}

component main {public [mapDataMerkleRoot]} = JungleMove(31, 2);
