pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/switcher.circom";
include "./utils/merkleDataAccess.circom";

// Assumes 8 bit values for x and y coords

// Returns the absolute difference between `a` and `b`
template AbsDiff() {
    signal input a;
    signal input b;

    signal output out;

    component lessThan = LessThan(8);
    lessThan.in[0] <== a;
    lessThan.in[1] <== b;

    // TODO audit
    component switcher = Switcher();
    switcher.R <== a;
    switcher.L <== b;
    switcher.sel <== lessThan.out;
    
    out <== switcher.outR - switcher.outL;
}

// Ensures that the input value is either 0 or 1
template EnsureIsBit() {
    signal input in;

    in * (in - 1) === 0;
}

// TODO renmane this to jungleMove and get rid of old one, and update comments
// Checks that move is valid (single cell orthogonal onto a jungle tile), and outputs
// the old and new commitments so that they can be checked for validity
//
// oldX, oldY, newX and newY seem like they might need range checks, as anything could
// be passed as private signals, but the actually don't because the hash commitment 
// confirms that the oldX and oldY for the very first jungleMove are valid because they
// were publicly verified by the contract, and the newX and newY for that move are valid
// based on the absDiff check, and hence the chain of x and y values that come afterwards
// inherit that initial validity 
template JungleMove() {
    signal input oldX;
    signal input oldY;
    signal input oldNonce;
    signal input newX;
    signal input newY;

    // See MerkleDataBitAccess component for signal explanations
    var merkleTreeDepth = 2; 
    signal input mapDataMerkleLeaf;
    signal input mapDataMerkleSiblings[merkleTreeDepth];
    signal input mapDataMerkleRoot; // TODO make this an output rather than input?

    signal output oldCommit;
    signal output newCommit;
    
    // Check that movement is single cell orthogonal
    // TODO (probably need to worry about overflow? Also grid boundary checking) 
    component absXDiff = AbsDiff();
    absXDiff.a <== oldX;
    absXDiff.b <== newX;

    component absYDiff = AbsDiff();
    absYDiff.a <== oldY;
    absYDiff.b <== newY;

    component ensureXIsBit = EnsureIsBit();
    component ensureYIsBit = EnsureIsBit();
    ensureXIsBit.in <== absXDiff.out;
    ensureYIsBit.in <== absYDiff.out;
    absXDiff.out + absYDiff.out === 1;

    // Check commitments are correct
    component poseidonOld = Poseidon(3);
    component poseidonNew = Poseidon(3);

    poseidonOld.inputs[0] <== oldX;
    poseidonOld.inputs[1] <== oldY;
    poseidonOld.inputs[2] <== oldNonce;
    poseidonNew.inputs[0] <== newX;
    poseidonNew.inputs[1] <== newY;
    poseidonNew.inputs[2] <== oldNonce + 1;

    oldCommit <== poseidonOld.out;
    newCommit <== poseidonNew.out;

    // Check that the new map cell is of type jungle (1)
    var mapSize = 31; // 31 * 31 map
    component merkleDataBitAccess = MerkleDataBitAccess(merkleTreeDepth);
    merkleDataBitAccess.bitIndex <== newX + newY * mapSize;
    merkleDataBitAccess.dataLeaf <== mapDataMerkleLeaf;
    for (var i = 0; i < merkleTreeDepth; i++) {
        merkleDataBitAccess.merkleSiblings[i] <== mapDataMerkleSiblings[i];
    }
    merkleDataBitAccess.merkleRoot <== mapDataMerkleRoot;

    merkleDataBitAccess.out === 1;
}

component main {public [mapDataMerkleRoot]} = JungleMove();
