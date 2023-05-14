// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById, getSystemAddressById, addressToEntity} from "solecs/utils.sol";
import {HiddenSearchResponseVerifier} from "../dependencies/HiddenSearchResponseVerifier.sol";
import {PublicKeyComponent, ID as PublicKeyComponentID} from "../components/PublicKeyComponent.sol";
import {PositionCommitmentComponent, ID as PositionCommitmentComponentID} from "../components/PositionCommitmentComponent.sol";
import {NullifierQueueLib} from "../libraries/NullifierQueueLib.sol";
import {SearchResultComponent, ID as SearchResultComponentID, SearchResult} from "../components/SearchResultComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.HiddenSearchResponse"));

contract HiddenSearchResponseSystem is System {
  HiddenSearchResponseVerifier hiddenSearchResponseVerifier;
  PublicKeyComponent publicKeyComponent;
  PositionCommitmentComponent positionCommitmentComponent;
  SearchResultComponent searchResultComponent;

  uint256 constant fieldElemMask = (1 << 253) - 1;

  constructor(
    IWorld _world, 
    address _components,
    address hiddenSearchResponseVerifierAddress
  ) System(_world, _components) {
    hiddenSearchResponseVerifier = HiddenSearchResponseVerifier(hiddenSearchResponseVerifierAddress);
    publicKeyComponent = PublicKeyComponent(getAddressById(components, PublicKeyComponentID));
    positionCommitmentComponent = PositionCommitmentComponent(
      getAddressById(components, PositionCommitmentComponentID)
    );
    searchResultComponent = SearchResultComponent(
      getAddressById(components, SearchResultComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256[] memory cipherText, uint256 encryptionNonce, uint256 nullifier, 
      uint256[8] memory proofData) = abi.decode(arguments, (uint256, uint256[], uint256, uint256, 
      uint256[8]));
    executeTyped(entity, cipherText, encryptionNonce, nullifier, proofData);
  }

  function executeTyped(
    uint256 entity, uint256[] memory cipherText, uint256 encryptionNonce, uint256 nullifier, 
    uint256[8] memory proofData
  ) public returns (bytes memory) {
    uint256[] memory responderPublicKey = publicKeyComponent.getValue(addressToEntity(msg.sender));

    // Note below, the entity id is masked to ensure it fits into a field element
    hiddenSearchResponseVerifier.verifyProof(
      proofData, 
      [
        nullifier, entity & fieldElemMask, positionCommitmentComponent.getValue(entity),
        responderPublicKey[0], responderPublicKey[1], cipherText[0], cipherText[1], 
        cipherText[2], cipherText[3], encryptionNonce
      ]
    );

    searchResultComponent.set(entity, SearchResult(cipherText, encryptionNonce));
    NullifierQueueLib.pushNullifier(components, entity, nullifier);
  }
}
