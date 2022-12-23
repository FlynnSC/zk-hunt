// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getSystemAddressById} from "solecs/utils.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {LootLib} from "../libraries/LootLib.sol";
import {AssertPositionSystem, ID as AssertPositionSystemID} from "./AssertPositionSystem.sol";
import {Position} from "../components/PositionComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.JungleLoot"));

contract JungleLootSystem is System {
  constructor(IWorld _world, address _components) System(_world, _components) {}

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 entityToLoot, Position memory position, uint256[8] memory proofData) 
      = abi.decode(arguments, (uint256, uint256, Position, uint256[8]));
    executeTyped(entity, entityToLoot, position, proofData);
  }

  function executeTyped(
    uint256 entity, uint256 entityToLoot, Position memory position, uint256[8] memory proofData
  ) public returns (bytes memory) {
    AssertPositionSystem(getSystemAddressById(components, AssertPositionSystemID)).executeTyped(
      entity, position, proofData
    );
    LootLib.loot(components, entity, entityToLoot);
  }
}
