// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById} from "solecs/utils.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {LootLib} from "../libraries/LootLib.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.Loot"));

contract LootSystem is System {
  constructor(IWorld _world, address _components) System(_world, _components) {}

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 entityToLoot) = abi.decode(arguments, (uint256, uint256));
    executeTyped(entity, entityToLoot);
  }

  function executeTyped(uint256 entity, uint256 entityToLoot) public returns (bytes memory) {
    JungleMoveCountComponent jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );

    // Can loot outside the jungle, or when having just entered the jungle
    require(
      !jungleMoveCountComponent.has(entity) || jungleMoveCountComponent.getValue(entity) == 1,
      "Cannot perform normal loot while position is ambiguous"
    );

    LootLib.loot(components, entity, entityToLoot);
  }
}
