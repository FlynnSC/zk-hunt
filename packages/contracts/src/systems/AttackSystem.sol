// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById} from "solecs/utils.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {HitTileOffsetListDefinitions} from "../HitTileOffsetListDefinitions.sol";
import {AttackLib} from "../libraries/AttackLib.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.Attack"));

contract AttackSystem is System, HitTileOffsetListDefinitions {
  constructor(IWorld _world, address _components) System(_world, _components) {}

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 hitTilesEntity, uint8 directionIndex)
    = abi.decode(arguments, (uint256, uint256, uint8));
    executeTyped(entity, hitTilesEntity, directionIndex);
  }

  // The hitTilesEntity Id is created on the client
  function executeTyped(
    uint256 entity, uint256 hitTilesEntity, uint8 directionIndex
  ) public returns (bytes memory) {
    require(
      !JungleMoveCountComponent(getAddressById(components, JungleMoveCountComponentID)).has(entity),
      "Cannot perform normal attack while position is ambiguous"
    );

    AttackLib.attack(components, entity, hitTilesEntity, directionIndex, spearHitTileOffsetList);
  }
}
