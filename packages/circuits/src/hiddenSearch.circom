pragma circom 2.1.2;

include "utils/encryption/poseidonEncryption.circom";
include "utils/encryption/calcSharedKey.circom";
include "utils/calcChallengeTiles.circom";

// TODO test the constraint count of all circuit refactors against the old versions, and figure out
// why there are now more constraints?????

// TODO maybe merklise the cipherText and pass in as private signal?

// This circuit verifies the encryption of the challenge tiles and nullifier nonce that correspond
// to a new hidden search challenge. 
//
// TODO proper explanation of the need for each part of the nullifier, and maybe the contents of the
// cipherText? What gauntness does the nullifier actually provide for the system in terms of
// information reveal (or lack thereof) 
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
template HiddenSearch(challengeTileCount) {
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
    
    // Verifies that the supplied position matches the commitment
    signal commitment <== Poseidon(3)([x, y, positionCommitmentNonce]);
    commitment === positionCommitment;

    // Calculates the challenge tiles, and verifies the supplied offsets are valid
    signal challengeTilesXValues[challengeTileCount], challengeTilesYValues[challengeTileCount];
    (challengeTilesXValues, challengeTilesYValues) <== CalcChallengeTiles()(
        x, y, challengeTilesOffsetsXValues, challengeTilesOffsetsYValues
    );

    // Generates the shared key, and checks that the supplied challengerPrivateKey matches the 
    // supplied challengerPublicKey
    signal sharedKey[2] <== CalcSharedKey()(
        challengerPrivateKey, challengerPublicKey, responderPublicKey
    );

    // Checks that the challenge tiles and nullifierNonce are correctly encrypted with sharedKey
    signal message[messageSize];
    for (var i = 0; i < challengeTileCount; i++) {
        message[i] <== challengeTilesXValues[i];
        message[challengeTileCount + i] <== challengeTilesYValues[i];
    }
    message[messageSize - 2] <== challengedEntity;
    message[messageSize - 1] <== nullifierNonce;

    signal isEncryptionValid <== PoseidonEncryptCheck(messageSize)(
        encryptionNonce, cipherText, message, sharedKey
    );
    isEncryptionValid === 1;
}

component main { 
    public [positionCommitment, challengerPublicKey, cipherText, encryptionNonce]
} = HiddenSearch(4);
