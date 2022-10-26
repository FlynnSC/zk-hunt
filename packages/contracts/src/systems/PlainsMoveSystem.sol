// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {MoveSystem, Position} from "./MoveSystem.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.PlainsMove"));

contract PlainsMoveSystem is MoveSystem {
  constructor(IWorld _world, address _components) MoveSystem(_world, _components) {}

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, Position memory newPosition) = abi.decode(arguments, (uint256, Position));
    executeTyped(entity, newPosition);
  }

  function executeTyped(uint256 entity, Position memory newPosition) public returns (bytes memory) {
    super.move(entity, newPosition, TileType.PLAINS, TileType.PLAINS);
  }
}
