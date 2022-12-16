pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/gates.circom";
include "utils/encryption/poseidonEncryption.circom";
include "utils/encryption/calcSharedKey.circom";
include "utils/setInclusion.circom";

// TODO make the positionCommitment and challengeTilesMerkleChainRoot inputs rather than outputs?

// Either proves that the player's position was not included in the challenge tiles, or that the 
// nonce corresponding to the player's position commitment was correctly encrypted with the 
// sharedKey
template SearchResponse(challengeTileCount) {
    var messageSize = 1;
    var cipherTextSize = 4; // messageSize rounded up to the nearest multiple of 3, + 1

	// Private inputs
    signal input x, y;
    signal input positionCommitmentNonce; // The actual nonce
    signal input responderPrivateKey;
    signal input secretNonce; // The nonce to be encrypted (may be equal to positionCommitmentNonce)
    signal input challengeTilesXValues[challengeTileCount];
    signal input challengeTilesYValues[challengeTileCount];

    // Public inputs
    signal input positionCommitment;
    signal input responderPublicKey[2];
    signal input challengerPublicKey[2];
    signal input cipherText[cipherTextSize];
	signal input encryptionNonce; // Needed to encrypt/decrypt secretNonce

    // Outputs
    signal output challengeTilesMerkleChainRoot; // TODO make input?????

    // Verifies that the supplied position matches the commitment
    signal commitment <== Poseidon(3)([x, y, positionCommitmentNonce]);
    commitment === positionCommitment;

    // Generates the shared key, and checks that the supplied responderPrivateKey 
    // matches the supplied responderPublicKey
    signal sharedKey[2] <== CalcSharedKey()(
        responderPrivateKey, responderPublicKey, challengerPublicKey
    );

    // Checks that secretNonce is correctly encrypted with sharedKey
    signal isEncryptionValid <== PoseidonEncryptCheck(messageSize)(
        encryptionNonce, cipherText, [secretNonce], sharedKey
    );
    isEncryptionValid === 1;

    // Determines whether the supplied (x, y) were included in the challenge tiles, as well as 
    // calculating the merkle root
    signal wasFound;
    (wasFound, challengeTilesMerkleChainRoot) <== CoordSetInclusion(challengeTileCount)(
        x, y, challengeTilesXValues, challengeTilesYValues
    );

    // Ensures that either the secret nonce corresponds to the position commitment, or that the
    // supplied (x, y) wasn't actually included in the challenge tiles
    signal result <== XOR()(wasFound, IsEqual()([secretNonce, positionCommitmentNonce]));
    result === 0;
}

component main { 
    public [
        positionCommitment, responderPublicKey, challengerPublicKey, cipherText, encryptionNonce
    ]
} = SearchResponse(4);
