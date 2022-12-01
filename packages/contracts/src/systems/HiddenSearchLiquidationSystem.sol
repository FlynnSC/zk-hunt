// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById, getSystemAddressById, addressToEntity} from "solecs/utils.sol";
import {HiddenSearchLiquidationVerifier} from "../dependencies/HiddenSearchLiquidationVerifier.sol";
import {PublicKeyComponent, ID as PublicKeyComponentID} from "../components/PublicKeyComponent.sol";
import {NullifierQueueLib} from "../libraries/NullifierQueueLib.sol";
import {HiddenChallengeComponent, ID as HiddenChallengeComponentID, HiddenChallenge} from "../components/HiddenChallengeComponent.sol";
import {LiquidationLib} from "../libraries/LiquidationLib.sol";
import {ControlledByComponent, ID as ControlledByComponentID} from "../components/ControlledByComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.HiddenSearchLiquidation"));

contract HiddenSearchLiquidationSystem is System {
  HiddenSearchLiquidationVerifier hiddenSearchLiquidationVerifier;
  PublicKeyComponent publicKeyComponent;
  HiddenChallengeComponent hiddenChallengeComponent;
  ControlledByComponent controlledByComponent;

  uint256 constant fieldElemMask = (1 << 253) - 1;
  uint256 constant responsePeriod = 10; // Seconds since challenge creation
  uint256 constant liquidationPeriod = 10; // Seconds after the end of the response period

  constructor(
    IWorld _world, 
    address _components,
    address hiddenSearchLiquidationVerifierAddress
  ) System(_world, _components) {
    hiddenSearchLiquidationVerifier = HiddenSearchLiquidationVerifier(hiddenSearchLiquidationVerifierAddress);
    publicKeyComponent = PublicKeyComponent(getAddressById(components, PublicKeyComponentID));
    hiddenChallengeComponent = HiddenChallengeComponent(
      getAddressById(components, HiddenChallengeComponentID)
    );
    controlledByComponent = ControlledByComponent(
      getAddressById(components, ControlledByComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 hiddenChallengeEntity, uint256 challengedEntity, uint256 nullifier, 
      uint256[8] memory proofData) = abi.decode(arguments, (uint256, uint256, uint256, uint256[8]));
    executeTyped(hiddenChallengeEntity, challengedEntity, nullifier, proofData);
  }

  function executeTyped(
    uint256 hiddenChallengeEntity, uint256 challengedEntity, uint256 nullifier, 
    uint256[8] memory proofData
  ) public returns (bytes memory) {
    address responder = controlledByComponent.getValue(challengedEntity);
    uint256[] memory responderPublicKey = publicKeyComponent.getValue(addressToEntity(responder));

    uint256[] memory challengerPublicKey = publicKeyComponent.getValue(addressToEntity(msg.sender));
    HiddenChallenge memory hiddenChallenge = hiddenChallengeComponent.getValue(hiddenChallengeEntity);

    require(
      block.timestamp > hiddenChallenge.creationTimestamp + responsePeriod,
      "Response period has not elapsed"
    );

    require(
      block.timestamp < hiddenChallenge.creationTimestamp + responsePeriod + liquidationPeriod,
      "Challenge period has elapsed"
    );

    // Note below, the entity id is masked to ensure it fits into a field element
    require(
      hiddenSearchLiquidationVerifier.verifyProof(
        proofData, 
        [
          challengedEntity & fieldElemMask, 
          responderPublicKey[0], responderPublicKey[1],
          challengerPublicKey[0], challengerPublicKey[1], 
          hiddenChallenge.cipherText[0], hiddenChallenge.cipherText[1], 
          hiddenChallenge.cipherText[2], hiddenChallenge.cipherText[3], 
          hiddenChallenge.cipherText[4], hiddenChallenge.cipherText[5], 
          hiddenChallenge.cipherText[6], hiddenChallenge.cipherText[7], 
          hiddenChallenge.cipherText[8], hiddenChallenge.cipherText[9], 
          hiddenChallenge.cipherText[10], hiddenChallenge.cipherText[11], 
          hiddenChallenge.cipherText[12], hiddenChallenge.encryptionNonce, 
          NullifierQueueLib.getRoot(components)
        ]
      ),
      "Invalid proof"
    );

    LiquidationLib.liquidate(components, challengedEntity);
  }
}
