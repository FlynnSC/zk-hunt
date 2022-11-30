pragma circom 2.1.2;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "utils/encryption/poseidonEncryption.circom";
include "utils/encryption/calcSharedKey.circom";
include "utils/calcMerkleRoot.circom";
include "utils/setInclusion.circom";

// TODO maybe merklise the cipherText and pass in as private signal?

// This circuit proves that there has not been a nullifier submitted (contract checks that the 
// challenge period is still active though) for the challenge referenced by the cipherText, 
// and hence the player referenced in that challenge can be liquidated
template HiddenSearchLiquidation () {
    var challengeTileCount = 4;

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

    // Intermediate
    signal sharedKey[2];
    signal nullifier;

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

    // Checks that the suppled challenge tiles, challengedEntity and nullifierNonce were what was 
    // contained within the public cipherText
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

    // Calculates the merkleChainRoot of the challenge tiles
    component calcCoordsMerkleChainRoot = CalcCoordsMerkleChainRoot(challengeTileCount);
    for (var i = 0; i < challengeTileCount; i++) {
        calcCoordsMerkleChainRoot.xValues[i] <== challengeTilesXValues[i];
        calcCoordsMerkleChainRoot.yValues[i] <== challengeTilesYValues[i];
    }

    // Calculates the deterministic nullifier
    component p2 = Poseidon(4);
    p2.inputs[0] <== calcCoordsMerkleChainRoot.out;
    p2.inputs[1] <== challengedEntity;
    p2.inputs[2] <== sharedKey[0];
    p2.inputs[3] <== nullifierNonce;
    nullifier <== p2.out;

    // Ensures that the calculated nullifier is not part of the nullifier merkle queue
    component setInclusion = SetInclusion(nullifierMerkleQueueSize);
    setInclusion.value <== nullifier;
    for (var i = 0; i < nullifierMerkleQueueSize; i++) {
        setInclusion.setValues[i] <== nullifierMerkleQueueValues[i];
    }

    setInclusion.setMerkleChainRoot === nullifierMerkleQueueRoot;
    setInclusion.out === 0;
}

component main { 
    public [
        challengedEntity, responderPublicKey, challengerPublicKey, cipherText, encryptionNonce, 
        nullifierMerkleQueueRoot
    ] 
} = HiddenSearchLiquidation();
