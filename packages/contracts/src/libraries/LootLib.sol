// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {IUint256Component} from "solecs/interfaces/IUint256Component.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {DeadComponent, ID as DeadComponentID} from "../components/DeadComponent.sol";
import {LootCountComponent, ID as LootCountComponentID} from "../components/LootCountComponent.sol";

library LootLib {
  function loot(IUint256Component components, uint256 entity, uint256 entityToLoot) internal {
    PositionComponent positionComponent = PositionComponent(
      getAddressById(components, PositionComponentID)
    );
    DeadComponent deadComponent = DeadComponent(getAddressById(components, DeadComponentID));
    LootCountComponent lootCountComponent = LootCountComponent(
      getAddressById(components, LootCountComponentID)
    );

    require(deadComponent.has(entityToLoot), "Cannot loot player that is still alive");

    Position memory entityPosition = positionComponent.getValue(entity);
    Position memory entityToLootPosition = positionComponent.getValue(entityToLoot);
    require(
      entityPosition.x == entityToLootPosition.x && entityPosition.y == entityToLootPosition.y,
      "Cannot loot player in a different location"
    );

    positionComponent.remove(entityToLoot);
    uint256 oldLootCount = lootCountComponent.has(entity) ? lootCountComponent.getValue(entity) : 0;
    lootCountComponent.set(entity, oldLootCount + 1);
  }
}
