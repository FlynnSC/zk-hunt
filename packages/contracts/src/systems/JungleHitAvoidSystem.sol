// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {JungleHitAvoidVerifier} from "../dependencies/JungleHitAvoidVerifier.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {GodID} from "../Constants.sol";
import {PendingChallengeUpdateLib} from "../libraries/PendingChallengeUpdateLib.sol";
import {ChallengeTilesComponent, ID as ChallengeTilesComponentID, ChallengeTileSet, ChallengeType} from "../components/ChallengeTilesComponent.sol";
import {PositionCommitmentComponent, ID as PositionCommitmentComponentID} from "../components/PositionCommitmentComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.JungleHitAvoid"));

contract JungleHitAvoidSystem is System {
  JungleHitAvoidVerifier jungleHitAvoidVerifier;
  ChallengeTilesComponent challengeTilesComponent;
  PositionCommitmentComponent positionCommitmentComponent;

  constructor(
    IWorld _world,
    address _components,
    address jungleHitAvoidVerifierAddress
  ) System(_world, _components) {
    jungleHitAvoidVerifier = JungleHitAvoidVerifier(jungleHitAvoidVerifierAddress);
    challengeTilesComponent = ChallengeTilesComponent(getAddressById(components, ChallengeTilesComponentID));
    positionCommitmentComponent = PositionCommitmentComponent(
      getAddressById(components, PositionCommitmentComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 challengeTilesEntity, uint256[8] memory proofData)
    = abi.decode(arguments, (uint256, uint256, uint256[8]));
    executeTyped(entity, challengeTilesEntity, proofData);
  }

  // Assumes that the provided challengeTilesEntity is actually one of the potential hits,
  // pendingChallengeUpdateLib.remove(...) does nothing if it isn't
  function executeTyped(
    uint256 entity,
    uint256 challengeTilesEntity,
    uint256[8] memory proofData
  ) public returns (bytes memory) {
    ChallengeTileSet memory challengeTileSet = challengeTilesComponent.getValue(challengeTilesEntity);
    uint256 positionCommitment = positionCommitmentComponent.getValue(entity);

    require(
      challengeTileSet.challengeType == ChallengeType.ATTACK,
      "Response for incorrect challenge type"
    );

    require(
      jungleHitAvoidVerifier.verifyProof(
        proofData, [challengeTileSet.merkleChainRoot, positionCommitment]
      ),
      "Invalid proof"
    );

    PendingChallengeUpdateLib.remove(components, entity, challengeTilesEntity);
  }
}
