// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {JungleHitAvoidVerifier} from "../dependencies/JungleHitAvoidVerifier.sol";
import {getAddressById} from "solecs/utils.sol";
import {GodID} from "../Constants.sol";
import {PotentialHitComponent, ID as PotentialHitComponentID} from "../components/PotentialHitComponent.sol";
import {HitTilesComponent, ID as HitTilesComponentID} from "../components/HitTilesComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.JungleHitAvoid"));

// TODO make it so that an entity can have multiple potential hits active, and would 
// have to address all of them
contract JungleHitAvoidSystem is System {
  JungleHitAvoidVerifier jungleHitAvoidVerifier;
  PotentialHitComponent potentialHitComponent;
  HitTilesComponent hitTilesComponent;

  constructor(
    IWorld _world, 
    address _components,
    address jungleHitAvoidVerifierAddress
  ) System(_world, _components) {
    jungleHitAvoidVerifier = JungleHitAvoidVerifier(jungleHitAvoidVerifierAddress);
    hitTilesComponent = HitTilesComponent(getAddressById(components, HitTilesComponentID));
    potentialHitComponent = PotentialHitComponent(
      getAddressById(components, PotentialHitComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256[8] memory proofData) = abi.decode(arguments, (uint256, uint256[8]));
    executeTyped(entity, proofData);
  }

  function executeTyped(
    uint256 entity, 
    uint256[8] memory proofData
  ) public returns (bytes memory) {
    uint256 hitTilesEntity = potentialHitComponent.getValue(entity);
    uint256 hitTitlesMerkleRoot = hitTilesComponent.getValue(hitTilesEntity).merkleRoot;
    require(
      jungleHitAvoidVerifier.verifyProof(proofData, [hitTitlesMerkleRoot]),
      "Invalid proof"
    );

    potentialHitComponent.remove(entity);
  }
}
