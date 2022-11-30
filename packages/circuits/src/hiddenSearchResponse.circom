pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/gates.circom";
include "utils/encryption/poseidonEncryption.circom";
include "utils/encryption/calcSharedKey.circom";
include "utils/setInclusion.circom";

// TODO maybe merklise the cipherText and pass in as private signal?

// Either proves that the player's position was not included in the challenge tiles, or that the 
// nonce corresponding to the player's position commitment was correctly encrypted with the 
// sharedKey. Ouputs a nullifier that is saved into the contract's nullifier merkle queue, which 
// prevents the challenger liquidating them once the response window has finished
//
// This circuit makes no reference to the public encryption of the challenge tiles, and hence could
// pass in completely bogus challenge tiles and still satisfy the circuit, but it would generate a 
// nullifier that is different to the one that is implicitly generated from the actual challenge 
// tiles, and hence doing so would have no beneft as they could still be liquidated
template HiddenSearchResponse () {
    var challengeTileCount = 4;
    var messageSize = 1; // The secretNonce
    var cipherTextSize = 4; // messageSize rounded up to the nearest multiple of 3, + 1

	// Private inputs
    signal input x;
    signal input y;
    signal input positionCommitmentNonce; // The actual nonce

    signal input responderPrivateKey;
    signal input challengerPublicKey[2];
    signal input secretNonce; // The nonce to be encrypted (may be equal to positionCommitmentNonce)
    
    signal input challengeTilesXValues[challengeTileCount];
    signal input challengeTilesYValues[challengeTileCount];
    signal input nullifierNonce; // Used in the generation of the nullifier

    // Public inputs
    signal input challengedEntity;
    signal input positionCommitment;
    signal input responderPublicKey[2]; // Needs to be public so that the contract can ensure that a player can't create a response for someone else
    signal input cipherText[cipherTextSize];
    signal input encryptionNonce; // Used to encrypt/decrypt the cipherText

    // Outputs
    signal output nullifier;

    // Intermediate
    signal sharedKey[2];

    // Verifies that the supplied position matches the commitment
    component p1 = Poseidon(3);
    p1.inputs[0] <== x;
    p1.inputs[1] <== y;
    p1.inputs[2] <== positionCommitmentNonce;
    p1.out === positionCommitment;

    // Generates the shared key, and checks that the supplied responderPrivateKey matches the 
    // supplied responderPublicKey
    component calcSharedKey = CalcSharedKey();
    calcSharedKey.senderPrivateKey <== responderPrivateKey;
    calcSharedKey.senderPublicKey[0] <== responderPublicKey[0];
    calcSharedKey.senderPublicKey[1] <== responderPublicKey[1];
    calcSharedKey.receiverPublicKey[0] <== challengerPublicKey[0];
    calcSharedKey.receiverPublicKey[1] <== challengerPublicKey[1];
    
    sharedKey[0] <== calcSharedKey.out[0];
    sharedKey[1] <== calcSharedKey.out[1];

    // Checks that secretNonce is correctly encrypted with sharedKey
    component poseidonEncryptCheck = PoseidonEncryptCheck(messageSize);
    for (var i = 0; i < cipherTextSize; i++) {
        poseidonEncryptCheck.ciphertext[i] <== cipherText[i];
    }

    poseidonEncryptCheck.nonce <== encryptionNonce;
    poseidonEncryptCheck.message[0] <== secretNonce;
    poseidonEncryptCheck.key[0] <== sharedKey[0];
    poseidonEncryptCheck.key[1] <== sharedKey[1];
    poseidonEncryptCheck.out === 1;

    // Determines whether the supplied (x, y) were included in the hit tiles, as well as 
    // outputting the merkle root for the challenge tiles
    component coordSetInclusion = CoordSetInclusion(challengeTileCount);
    coordSetInclusion.x <== x;
    coordSetInclusion.y <== y;
    for (var i = 0; i < challengeTileCount; i++) {
        coordSetInclusion.setXValues[i] <== challengeTilesXValues[i];
        coordSetInclusion.setYValues[i] <== challengeTilesYValues[i];
    }

    // Ensures that either the secret nonce corresponds to the position commitment, or that the
    // supplied (x, y) wasn't actually included in the challenge tiles
    component isEqual = IsEqual();
    isEqual.in[0] <== secretNonce;
    isEqual.in[1] <== positionCommitmentNonce;

    component xor = XOR();
    xor.a <== isEqual.out;
    xor.b <== coordSetInclusion.out;
    xor.out === 0;

    // Calculates and outputs the deterministic nullifier
    component p2 = Poseidon(4);
    p2.inputs[0] <== coordSetInclusion.setMerkleChainRoot;
    p2.inputs[1] <== challengedEntity;
    p2.inputs[2] <== sharedKey[0];
    p2.inputs[3] <== nullifierNonce;

    nullifier <== p2.out;
}

component main { 
    public [
        challengedEntity, positionCommitment, responderPublicKey, cipherText, 
        encryptionNonce
    ] 
} = HiddenSearchResponse();
