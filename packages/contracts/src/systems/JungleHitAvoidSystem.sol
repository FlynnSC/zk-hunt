// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {JungleHitAvoidVerifier} from "../dependencies/JungleHitAvoidVerifier.sol";
import {getAddressById} from "solecs/utils.sol";
import {GodID} from "../Constants.sol";
import {PotentialHitsComponent, ID as PotentialHitsComponentID} from "../components/PotentialHitsComponent.sol";
import {HitTilesComponent, ID as HitTilesComponentID} from "../components/HitTilesComponent.sol";
import {PositionCommitmentComponent, ID as PositionCommitmentComponentID} from "../components/PositionCommitmentComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.JungleHitAvoid"));

contract JungleHitAvoidSystem is System {
  JungleHitAvoidVerifier jungleHitAvoidVerifier;
  PotentialHitsComponent potentialHitsComponent;
  HitTilesComponent hitTilesComponent;
  PositionCommitmentComponent positionCommitmentComponent;

  constructor(
    IWorld _world, 
    address _components,
    address jungleHitAvoidVerifierAddress
  ) System(_world, _components) {
    jungleHitAvoidVerifier = JungleHitAvoidVerifier(jungleHitAvoidVerifierAddress);
    hitTilesComponent = HitTilesComponent(getAddressById(components, HitTilesComponentID));
    potentialHitsComponent = PotentialHitsComponent(
      getAddressById(components, PotentialHitsComponentID)
    );
    positionCommitmentComponent = PositionCommitmentComponent(
      getAddressById(components, PositionCommitmentComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 hitTilesEntity, uint256[8] memory proofData) 
      = abi.decode(arguments, (uint256, uint256, uint256[8]));
    executeTyped(entity, hitTilesEntity, proofData);
  }

  // Assumes that the provided hitTilesEntity is actually one of the potential hits, 
  // removePotentialHit() does nothing if it isn't
  function executeTyped(
    uint256 entity, 
    uint256 hitTilesEntity,
    uint256[8] memory proofData
  ) public returns (bytes memory) {
    uint256 hitTitlesMerkleRoot = hitTilesComponent.getValue(hitTilesEntity).merkleRoot;
    require(
      jungleHitAvoidVerifier.verifyProof(
        proofData, 
        [hitTitlesMerkleRoot, positionCommitmentComponent.getValue(entity)]
      ),
      "Invalid proof"
    );

    potentialHitsComponent.removePotentialHit(entity, hitTilesEntity); 
  }
}
