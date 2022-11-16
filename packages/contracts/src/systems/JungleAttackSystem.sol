// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {Position} from "../components/PositionComponent.sol";
import {AssertPositionSystem, ID as AssertPositionSystemID} from "./AssertPositionSystem.sol";
import {AttackSystem, ID as AttackSystemID} from "./AttackSystem.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.JungleAttack"));

contract JungleAttackSystem is System {
  AssertPositionSystem assertPositionSystem;
  AttackSystem attackSystem;

  constructor(IWorld _world, address _components) System(_world, _components) {
    assertPositionSystem = AssertPositionSystem(
      getSystemAddressById(components, AssertPositionSystemID)
    );
    attackSystem = AttackSystem(getSystemAddressById(components, AttackSystemID));
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, Position memory position, uint256[8] memory proofData, uint256 hitTilesEntity, 
      uint8 directionIndex) = abi.decode(arguments, (uint256, Position, uint256[8], uint256, uint8));
    executeTyped(entity, position, proofData, hitTilesEntity, directionIndex);
  }

  function executeTyped(
    uint256 entity, 
    Position memory position, 
    uint256[8] memory proofData, 
    uint256 hitTilesEntity, 
    uint8 directionIndex
  ) public returns (bytes memory) {
    assertPositionSystem.executeTyped(entity, position, proofData);
    attackSystem.executeTyped(entity, hitTilesEntity, directionIndex);
  }
}
