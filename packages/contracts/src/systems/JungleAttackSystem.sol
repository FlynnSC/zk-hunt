// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {Position} from "../components/PositionComponent.sol";
import {AssertPositionSystem, ID as AssertPositionSystemID} from "./AssertPositionSystem.sol";
import {AttackLib} from "../libraries/AttackLib.sol";
import {ChallengeTilesOffsetListDefinitions} from "../ChallengeTilesOffsetListDefinitions.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.JungleAttack"));

contract JungleAttackSystem is System, ChallengeTilesOffsetListDefinitions {
  constructor(IWorld _world, address _components) System(_world, _components) {}

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, Position memory position, uint256[8] memory proofData, 
      uint256 challengeTilesEntity, uint8 directionIndex) = abi.decode(arguments, 
      (uint256, Position, uint256[8], uint256, uint8));
    executeTyped(entity, position, proofData, challengeTilesEntity, directionIndex);
  }

  function executeTyped(
    uint256 entity, 
    Position memory position, 
    uint256[8] memory proofData, 
    uint256 challengeTilesEntity, 
    uint8 directionIndex
  ) public returns (bytes memory) {
    AssertPositionSystem(getSystemAddressById(components, AssertPositionSystemID)).executeTyped(
      entity, position, proofData
    );
    AttackLib.attack(
      components, entity, challengeTilesEntity, directionIndex, challengeTilesOffsetList
    );
  }
}
