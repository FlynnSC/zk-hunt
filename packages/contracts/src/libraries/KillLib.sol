// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {DeadComponent, ID as DeadComponentID} from "../components/DeadComponent.sol";
import {PendingChallengeUpdateLib} from "../libraries/PendingChallengeUpdateLib.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {RevealedPotentialPositionsComponent, ID as RevealedPotentialPositionsComponentID} from "../components/RevealedPotentialPositionsComponent.sol";
import {PendingChallengesComponent, ID as PendingChallengesComponentID} from "../components/PendingChallengesComponent.sol";
import {IUint256Component} from "solecs/interfaces/IUint256Component.sol";

library KillLib {
  function kill(IUint256Component components, uint256 entity) internal {
    DeadComponent deadComponent = DeadComponent(getAddressById(components, DeadComponentID));
    if (!deadComponent.has(entity)) {
      deadComponent.set(entity);
      JungleMoveCountComponent(getAddressById(components, JungleMoveCountComponentID)).remove(entity);
      RevealedPotentialPositionsComponent(
        getAddressById(components, RevealedPotentialPositionsComponentID)
      ).remove(entity);
      PendingChallengeUpdateLib.clear(components, entity);
    }
  }
}
