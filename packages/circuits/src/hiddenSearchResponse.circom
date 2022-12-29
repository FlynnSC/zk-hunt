pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/gates.circom";
include "utils/encryption/poseidonEncryption.circom";
include "utils/encryption/calcSharedKey.circom";
include "utils/setInclusion.circom";

// Either proves that the player's position was not included in the challenge tiles, or that the
// nonce corresponding to the player's position commitment was correctly encrypted with the
// sharedKey. Ouputs a nullifier that is saved into the contract's nullifier merkle queue, which
// prevents the challenger liquidating them once the response window has finished
//
// This circuit makes no reference to the public encryption of the challenge tiles, and hence could
// pass in completely bogus challenge tiles and still satisfy the circuit, but it would generate a
// nullifier that is different to the one that is implicitly generated from the actual challenge
// tiles, and hence doing so would have no beneft as they could still be liquidated
template HiddenSearchResponse (challengeTileCount) {
    var messageSize = 1; // The secretNonce
    var cipherTextSize = 4; // messageSize rounded up to the nearest multiple of 3, + 1

	// Private inputs
    signal input x, y;
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

    // Verifies that the supplied position matches the commitment
    signal commitment <== Poseidon(3)([x, y, positionCommitmentNonce]);
    commitment === positionCommitment;

    // Generates the shared key, and checks that the supplied responderPrivateKey matches the
    // supplied responderPublicKey
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
    signal wasFound, challengeTilesMerkleChainRoot;
    (wasFound, challengeTilesMerkleChainRoot) <== CoordSetInclusion(challengeTileCount)(
        x, y, challengeTilesXValues, challengeTilesYValues
    );

    // Ensures that either the secret nonce corresponds to the position commitment, or that the
    // supplied (x, y) wasn't actually included in the challenge tiles
    signal result <== XOR()(wasFound, IsEqual()([secretNonce, positionCommitmentNonce]));
    result === 0;

    // Calculates and outputs the deterministic nullifier
    nullifier <== Poseidon(4)(
        [challengeTilesMerkleChainRoot, challengedEntity, sharedKey[0], nullifierNonce]
    );
}

component main {
    public [
        challengedEntity, positionCommitment, responderPublicKey, cipherText,
        encryptionNonce
    ]
} = HiddenSearchResponse(4);
