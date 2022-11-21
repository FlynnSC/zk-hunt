// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById, getSystemAddressById, addressToEntity} from "solecs/utils.sol";
import {ChallengeTilesComponent, ID as ChallengeTilesComponentID, ChallengeTileSet} from "../components/ChallengeTilesComponent.sol";
import {Position} from "../components/PositionComponent.sol";
import {PositionCommitmentComponent, ID as PositionCommitmentComponentID} from "../components/PositionCommitmentComponent.sol";
import {PendingChallengeUpdateSystem, ID as PendingChallengeUpdateSystemID, UpdateType} from "./PendingChallengeUpdateSystem.sol";
import {SearchResponseVerifier} from "../dependencies/SearchResponseVerifier.sol";
import {SearchResultComponent, ID as SearchResultComponentID, SearchResult} from "../components/SearchResultComponent.sol";
import {PublicKeyComponent, ID as PublicKeyComponentID} from "../components/PublicKeyComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.SearchResponse"));

contract SearchResponseSystem is System {
  ChallengeTilesComponent challengeTilesComponent;
  PositionCommitmentComponent positionCommitmentComponent;
  PendingChallengeUpdateSystem pendingChallengeUpdateSystem;
  SearchResponseVerifier searchResponseVerifier;
  SearchResultComponent searchResultComponent;
  PublicKeyComponent publicKeyComponent;

  constructor(
    IWorld _world, 
    address _components,
    address searchResponseVerifierAddress
  ) System(_world, _components) {
    challengeTilesComponent = ChallengeTilesComponent(getAddressById(components, ChallengeTilesComponentID));
    positionCommitmentComponent = PositionCommitmentComponent(
      getAddressById(components, PositionCommitmentComponentID)
    );
    pendingChallengeUpdateSystem = PendingChallengeUpdateSystem(
      getSystemAddressById(components, PendingChallengeUpdateSystemID)
    );
    searchResponseVerifier = SearchResponseVerifier(searchResponseVerifierAddress);
    searchResultComponent = SearchResultComponent(
      getAddressById(components, SearchResultComponentID)
    );
    publicKeyComponent = PublicKeyComponent(getAddressById(components, PublicKeyComponentID));
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 challengeTilesEntity, uint256[] memory encryptedSecretNonce, 
      uint256 encryptionNonce, uint256[8] memory proofData) = abi.decode(arguments, 
      (uint256, uint256, uint256[], uint256, uint256[8]));
    executeTyped(entity, challengeTilesEntity, encryptedSecretNonce, encryptionNonce, proofData);
  }

  function executeTyped(
    uint256 entity, 
    uint256 challengeTilesEntity,
    uint256[] memory encryptedSecretNonce,
    uint256 encryptionNonce,
    uint256[8] memory proofData
  ) public returns (bytes memory) {
    ChallengeTileSet memory challengeTiles = challengeTilesComponent.getValue(challengeTilesEntity);
    uint256[] memory playerPublicKey = publicKeyComponent.getValue(addressToEntity(msg.sender));
    uint256[] memory challengerPublicKey = publicKeyComponent.getValue(
      addressToEntity(challengeTiles.challenger)
    );
    require(
      searchResponseVerifier.verifyProof(
        proofData, 
        [
          positionCommitmentComponent.getValue(entity), challengeTiles.merkleRoot,
          playerPublicKey[0], playerPublicKey[1], 
          challengerPublicKey[0], challengerPublicKey[1],
          encryptedSecretNonce[0], encryptedSecretNonce[1], encryptedSecretNonce[2], 
          encryptedSecretNonce[3], encryptionNonce
        ]
      ),
      "Invalid proof"
    );

    // Setting the search result before updating the pending challenges is important, because the
    // challenger listens for updates to the latter to determine if the former is for them to 
    // decrypt and read
    searchResultComponent.set(entity, SearchResult(encryptedSecretNonce, encryptionNonce));
    pendingChallengeUpdateSystem.executeTyped(entity, challengeTilesEntity, UpdateType.REMOVE);
  }
}
