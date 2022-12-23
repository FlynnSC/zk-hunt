// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {IUint256Component} from "solecs/interfaces/IUint256Component.sol";
import {KillLib} from "../libraries/KillLib.sol";
import {ControlledByComponent, ID as ControlledByComponentID} from "../components/ControlledByComponent.sol";

library LiquidationLib {
  function liquidate(IUint256Component components, uint256 entity) internal {
    ControlledByComponent controlledByComponent = ControlledByComponent(
      getAddressById(components, ControlledByComponentID)
    );

    address owner = controlledByComponent.getValue(entity);
    uint256[] memory entities = controlledByComponent.getEntitiesWithValue(owner);
    for (uint256 i = 0; i < entities.length; ++i) {
      KillLib.kill(components, entities[i]);
    }
  }
}
