// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById, getSystemAddressById, addressToEntity} from "solecs/utils.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {HiddenChallengeComponent, ID as HiddenChallengeComponentID, HiddenChallenge} from "../components/HiddenChallengeComponent.sol";
import {HiddenSearchVerifier} from "../dependencies/HiddenSearchVerifier.sol";
import {PublicKeyComponent, ID as PublicKeyComponentID} from "../components/PublicKeyComponent.sol";
import {PositionCommitmentComponent, ID as PositionCommitmentComponentID} from "../components/PositionCommitmentComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.HiddenSearch"));

contract HiddenSearchSystem is System {
  JungleMoveCountComponent jungleMoveCountComponent;
  HiddenChallengeComponent hiddenChallengeComponent;
  HiddenSearchVerifier hiddenSearchVerifier;
  PublicKeyComponent publicKeyComponent;
  PositionCommitmentComponent positionCommitmentComponent;

  constructor(
    IWorld _world, 
    address _components,
    address hiddenSearchVerifierAddress
  ) System(_world, _components) {
    jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );
    hiddenChallengeComponent = HiddenChallengeComponent(
      getAddressById(components, HiddenChallengeComponentID)
    );
    hiddenSearchVerifier = HiddenSearchVerifier(hiddenSearchVerifierAddress);
    publicKeyComponent = PublicKeyComponent(getAddressById(components, PublicKeyComponentID));
    positionCommitmentComponent = PositionCommitmentComponent(
      getAddressById(components, PositionCommitmentComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 hiddenChallengeEntity, uint256[] memory cipherText, uint256 encryptionNonce, 
      uint256[8] memory proofData) = abi.decode(arguments, (uint256, uint256, uint256[], uint256, uint256[8]));
    executeTyped(entity, hiddenChallengeEntity, cipherText, encryptionNonce, proofData);
  }

  function executeTyped(
    uint256 entity, uint256 hiddenChallengeEntity, uint256[] memory cipherText, 
    uint256 encryptionNonce, uint256[8] memory proofData
  ) public returns (bytes memory) {
    require(jungleMoveCountComponent.has(entity), "Entity not in the jungle");

    require(
      !hiddenChallengeComponent.has(hiddenChallengeEntity), 
      "Supplied hidden challenge entity already exists"
    );

    uint256[] memory challengerPublicKey = publicKeyComponent.getValue(addressToEntity(msg.sender));

    require(
      hiddenSearchVerifier.verifyProof(
        proofData, 
        [
          positionCommitmentComponent.getValue(entity),
          challengerPublicKey[0], challengerPublicKey[1], cipherText[0], cipherText[1], 
          cipherText[2], cipherText[3], cipherText[4], cipherText[5], cipherText[6], cipherText[7], 
          cipherText[8], cipherText[9], cipherText[10], cipherText[11], cipherText[12], 
          encryptionNonce
        ]
      ),
      "Invalid proof"
    );

    hiddenChallengeComponent.set(
      hiddenChallengeEntity,
      HiddenChallenge(cipherText, encryptionNonce, msg.sender, block.timestamp)
    );    
  }
}
