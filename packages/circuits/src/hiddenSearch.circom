pragma circom 2.1.2;

include "utils/encryption/poseidonEncryption.circom";
include "utils/encryption/calcSharedKey.circom";
include "utils/calcChallengeTiles.circom";

// TODO maybe merklise the cipherText and pass in as private signal?

// This circuit verifies the encryption of the challenge tiles and nullifier nonce that correspond
// to a new hidden search challenge. 
//
// The implicit nullifier that is generated from this challenge is: 
// poseidon(challengeTilesMerkleChainRoot, challengedEntity, sharedKey[0], nullifierNonce)
// which binds the challenge to a specific challenger, responder, set of challenge tiles and 
// challenged entity
// 
// The presence of the nullifierNonce ensures the uniqueness of each nullifier even if two 
// challanges have the same challenge tiles and sharedKey. This prevents information being extracted 
// from the presence of repeated nullifiers, and ensures that the responder has to respond to both 
// of two identical challenges, rather than allowing them to just respond to the first and having 
// the resulting nullifier satisfy the second challenge as well
template HiddenSearch () {
    var challengeTileCount = 4;

    // (x, y) for each tile + challengedEntity + nullifierNonce
    var messageSize = 2 * challengeTileCount + 2;
    var cipherTextSize = 13; // messageSize rounded up to the nearest multiple of 3, + 1

	// Private inputs
    signal input x, y;
    signal input positionCommitmentNonce; 
    signal input challengerPrivateKey;
    signal input responderPublicKey[2];
    signal input challengeTilesOffsetsXValues[challengeTileCount];
    signal input challengeTilesOffsetsYValues[challengeTileCount];
    signal input challengedEntity;
    signal input nullifierNonce;

    // Public inputs
    signal input positionCommitment;
    signal input challengerPublicKey[2];
    signal input cipherText[cipherTextSize];
	signal input encryptionNonce; // Needed to encrypt/decrypt the challenge tiles

    // Intermediate
    signal sharedKey[2];
    signal challengeTilesXValues[challengeTileCount];
    signal challengeTilesYValues[challengeTileCount];

    // Verifies that the supplied position matches the commitment
    component p1 = Poseidon(3);
    p1.inputs[0] <== x;
    p1.inputs[1] <== y;
    p1.inputs[2] <== positionCommitmentNonce;
    p1.out === positionCommitment;

    // Calculates the challenge tiles, and verifies the supplied offsets are valid
    component calcChallengeTiles = CalcChallengeTiles();
    calcChallengeTiles.x <== x;
    calcChallengeTiles.y <== y;
    calcChallengeTiles.challengeTilesOffsetsXValues <== challengeTilesOffsetsXValues;
    calcChallengeTiles.challengeTilesOffsetsYValues <== challengeTilesOffsetsYValues;

    challengeTilesXValues <== calcChallengeTiles.challengeTilesXValues;
    challengeTilesYValues <== calcChallengeTiles.challengeTilesYValues;

    // Generates the shared key, and checks that the supplied challengerPrivateKey matches the 
    // supplied challengerPublicKey
    component calcSharedKey = CalcSharedKey();
    calcSharedKey.senderPrivateKey <== challengerPrivateKey;
    calcSharedKey.senderPublicKey[0] <== challengerPublicKey[0];
    calcSharedKey.senderPublicKey[1] <== challengerPublicKey[1];
    calcSharedKey.receiverPublicKey[0] <== responderPublicKey[0];
    calcSharedKey.receiverPublicKey[1] <== responderPublicKey[1];
    
    sharedKey[0] <== calcSharedKey.out[0];
    sharedKey[1] <== calcSharedKey.out[1];

    // Checks that the challenge tiles and nullifierNonce are correctly encrypted with sharedKey
    component poseidonEncryptCheck = PoseidonEncryptCheck(messageSize);
    for (var i = 0; i < challengeTileCount; i++) {
        poseidonEncryptCheck.message[i] <== challengeTilesXValues[i];
        poseidonEncryptCheck.message[challengeTileCount + i] <== challengeTilesYValues[i];
    }
    poseidonEncryptCheck.message[messageSize - 2] <== challengedEntity;
    poseidonEncryptCheck.message[messageSize - 1] <== nullifierNonce;

    for (var i = 0; i < cipherTextSize; i++) {
        poseidonEncryptCheck.ciphertext[i] <== cipherText[i];
    }

    poseidonEncryptCheck.nonce <== encryptionNonce;
    poseidonEncryptCheck.key[0] <== sharedKey[0];
    poseidonEncryptCheck.key[1] <== sharedKey[1];
    poseidonEncryptCheck.out === 1;
}

component main { 
    public [positionCommitment, challengerPublicKey, cipherText, encryptionNonce]
} = HiddenSearch();
