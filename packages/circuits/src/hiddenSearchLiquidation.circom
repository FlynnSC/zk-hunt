pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "utils/encryption/poseidonEncryption.circom";
include "utils/encryption/calcSharedKey.circom";
include "utils/calcMerkleRoot.circom";
include "utils/setInclusion.circom";

// This circuit proves that there has not been a nullifier submitted (contract checks that the
// challenge period is still active though) for the challenge referenced by the cipherText,
// and hence the player referenced in that challenge can be liquidated
template HiddenSearchLiquidation (challengeTileCount) {
    // (x, y) for each tile + challengedEntity + nullifierNonce
    var messageSize = 2 * challengeTileCount + 2;
    var cipherTextSize = 13; // messageSize rounded up to the nearest multiple of 3, + 1
    var nullifierMerkleQueueSize = 10;

	// Private inputs
    signal input challengerPrivateKey;
    signal input challengeTilesXValues[challengeTileCount];
    signal input challengeTilesYValues[challengeTileCount];
    signal input nullifierNonce; // Used in the generation of the nullifier
    signal input nullifierMerkleQueueValues[nullifierMerkleQueueSize];

    // Public inputs
    signal input challengedEntity;
    signal input responderPublicKey[2];
    signal input challengerPublicKey[2];
    signal input cipherText[cipherTextSize];
    signal input encryptionNonce; // Used to encrypt/decrypt the cipherText
    signal input nullifierMerkleQueueRoot;

    // Generates the shared key, and checks that the supplied challengerPrivateKey matches the
    // supplied challengerPublicKey
    signal sharedKey[2] <== CalcSharedKey()(
        challengerPrivateKey, challengerPublicKey, responderPublicKey
    );

    // Checks that the supplied challenge tiles, challengedEntity and nullifierNonce were what was
    // contained within the public cipherText
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

    // Calculates the challenge tiles commitment
    signal challengeTilesCommitment <== CalcCoordsMerkleChainRoot(challengeTileCount)(
        challengeTilesXValues, challengeTilesYValues
    );

    // Calculates the deterministic nullifier
    signal nullifier <== Poseidon(4)(
        [challengeTilesCommitment, challengedEntity, sharedKey[0], nullifierNonce]
    );

    // Ensures that the calculated nullifier is not part of the nullifier merkle queue
    signal nullifierExistsWithinQueue <== SetInclusion(nullifierMerkleQueueSize)(
        nullifier, nullifierMerkleQueueValues, nullifierMerkleQueueRoot
    );
    nullifierExistsWithinQueue === 0;
}

component main {
    public [
        challengedEntity, responderPublicKey, challengerPublicKey, cipherText, encryptionNonce,
        nullifierMerkleQueueRoot
    ]
} = HiddenSearchLiquidation(4);
