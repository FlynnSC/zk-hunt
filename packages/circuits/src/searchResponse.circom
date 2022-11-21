pragma circom 2.0.9;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/gates.circom";
include "utils/encryption/poseidon.circom";
include "utils/encryption/sharedKey.circom";
include "utils/positionSetInclusion.circom";

// Either proves that the player's position was not included in the challenge tiles, or that the 
// nonce corresponding to the player's position commitment was correctly encrypted with the 
// sharedKey
template SearchResponse () {
    var challengeTileCount = 4;

	// Private inputs
    signal input x;
    signal input y;
    signal input positionCommitmentNonce; // The actual nonce
    signal input senderPrivateKey;
    signal input secretNonce; // The nonce to be encrypted (may be equal to positionCommitmentNonce)
    signal input challengeTilesXValues[challengeTileCount];
    signal input challengeTilesYValues[challengeTileCount];

    // Public inputs
    signal input senderPublicKey[2];
    signal input receiverPublicKey[2];
    signal input encryptedSecretNonce[4];
	signal input encryptionNonce;            // Needed to decrypt secretNonce

    // Outputs
    signal output positionCommitment;
    signal output challengeTilesMerkleRoot;

    // Intermediate
    signal sharedKey[2];

    // Generates the shared key, and checks that the supplied senderPrivateKey 
    // matches the supplied senderPublicKey
    component sharedKeyCheck = SharedKey();
    sharedKeyCheck.senderPrivateKey <== senderPrivateKey;
    sharedKeyCheck.senderPublicKey[0] <== senderPublicKey[0];
    sharedKeyCheck.senderPublicKey[1] <== senderPublicKey[1];
    sharedKeyCheck.receiverPublicKey[0] <== receiverPublicKey[0];
    sharedKeyCheck.receiverPublicKey[1] <== receiverPublicKey[1];
    
    sharedKey[0] <== sharedKeyCheck.sharedKey[0];
    sharedKey[1] <== sharedKeyCheck.sharedKey[1];

    // Checks that secretNonce is correctly encrypted with sharedKey
    component p = PoseidonEncryptCheck(1);
    for (var i = 0; i < 4; i++) {
        p.ciphertext[i] <== encryptedSecretNonce[i];
    }

    // Implicit: encryptionNonce < 2^218
    p.nonce <== encryptionNonce;
    p.message[0] <== secretNonce;
    p.key[0] <== sharedKey[0];
    p.key[1] <== sharedKey[1];
    p.out === 1;

    // Determines whether the supplied (x, y) were included in the hit tiles, as well as 
    // outputting the merkle root for the challenge tiles
    component positionSetInclusion = PositionSetInclusion(challengeTileCount);
    positionSetInclusion.x <== x;
    positionSetInclusion.y <== y;
    for (var i = 0; i < challengeTileCount; i++) {
        positionSetInclusion.setXValues[i] <== challengeTilesXValues[i];
        positionSetInclusion.setYValues[i] <== challengeTilesYValues[i];
    }
    challengeTilesMerkleRoot <== positionSetInclusion.setMerkleRoot;

    // Calculates and outputs the position commitment
    component p1 = Poseidon(3);
    p1.inputs[0] <== x;
    p1.inputs[1] <== y;
    p1.inputs[2] <== positionCommitmentNonce;
    positionCommitment <== p1.out;

    // Ensures that either the secret nonce corresponds to the position commitment, or that the
    // supplied (x, y) wasn't actually included in the challenge tiles
    component isEqual = IsEqual();
    isEqual.in[0] <== secretNonce;
    isEqual.in[1] <== positionCommitmentNonce;

    component xor = XOR();
    xor.a <== isEqual.out;
    xor.b <== positionSetInclusion.out;
    xor.out === 0;
}

component main { 
    public [senderPublicKey, receiverPublicKey, encryptedSecretNonce, encryptionNonce]
} = SearchResponse();
