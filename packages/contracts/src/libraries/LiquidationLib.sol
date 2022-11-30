// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {IUint256Component} from "solecs/interfaces/IUint256Component.sol";
import {KillSystem, ID as KillSystemID} from "../systems/KillSystem.sol";
import {ControlledByComponent, ID as ControlledByComponentID} from "../components/ControlledByComponent.sol";

library LiquidationLib {
  function liquidate(IUint256Component components, uint256 entity) internal {
    KillSystem killSystem = KillSystem(getSystemAddressById(components, KillSystemID));
    ControlledByComponent controlledByComponent = ControlledByComponent(
      getAddressById(components, ControlledByComponentID)
    );

    address owner = controlledByComponent.getValue(entity);
    uint256[] memory entities = controlledByComponent.getEntitiesWithValue(owner);
    for (uint256 i = 0; i < entities.length; ++i) {
      killSystem.executeTyped(entities[i]);
    }
  }
}
