// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import {getAddressById} from "solecs/utils.sol";
import {DeadComponent, ID as DeadComponentID} from "../components/DeadComponent.sol";
import {PendingChallengesComponent, ID as PendingChallengesComponentID} from "../components/PendingChallengesComponent.sol";
import {IUint256Component} from "solecs/interfaces/IUint256Component.sol";

library ActionLib {
  function verifyCanPerformAction(IUint256Component components, uint256 entity) internal {
    require(
      !DeadComponent(getAddressById(components, DeadComponentID)).has(entity),
      "Cannot perform action while dead"
    );
    require(
      !PendingChallengesComponent(
        getAddressById(components, PendingChallengesComponentID)
      ).has(entity),
      "Cannot perform action while pending challenges exist"
    );
  }
}
