// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import {PendingChallengesComponent, ID as PendingChallengesComponentID} from "../components/PendingChallengesComponent.sol";
import {PendingChallengeCountComponent, ID as PendingChallengeCountComponentID} from "../components/PendingChallengeCountComponent.sol";
import {ChallengeTilesComponent, ID as ChallengeTilesComponentID} from "../components/ChallengeTilesComponent.sol";
import {getAddressById} from "solecs/utils.sol";
import {IUint256Component} from "solecs/interfaces/IUint256Component.sol";

library PendingChallengeUpdateLib {
  function add(IUint256Component components, uint256 entity, uint256 challengeTilesEntity) public {
    PendingChallengesComponent pendingChallengesComponent = PendingChallengesComponent(
      getAddressById(components, PendingChallengesComponentID)
    );
    PendingChallengeCountComponent pendingChallengeCountComponent = PendingChallengeCountComponent(
      getAddressById(components, PendingChallengeCountComponentID)
    );

    // Adds a new pending challenge to the entity
    uint256[] memory newPendingChallenges;
    if (pendingChallengesComponent.has(entity)) {
      uint256[] memory oldPendingChallenges = pendingChallengesComponent.getValue(entity);
      newPendingChallenges = new uint256[](oldPendingChallenges.length + 1);
      for (uint256 i = 0; i < oldPendingChallenges.length; ++i) {
        newPendingChallenges[i] = oldPendingChallenges[i];
      }
      newPendingChallenges[oldPendingChallenges.length] = challengeTilesEntity;
    } else {
      newPendingChallenges = new uint256[](1);
      newPendingChallenges[0] = challengeTilesEntity;
    }
    pendingChallengesComponent.set(entity, newPendingChallenges);

    // Increments the pending challenge count for the challengeTilesEntity
    uint256 pendingChallengeCount = pendingChallengeCountComponent.has(challengeTilesEntity) ?
      pendingChallengeCountComponent.getValue(challengeTilesEntity) : 0;
    pendingChallengeCountComponent.set(challengeTilesEntity, pendingChallengeCount + 1);
  }

  function remove(
    IUint256Component components, uint256 entity, uint256 challengeTilesEntity
  ) internal {
    PendingChallengesComponent pendingChallengesComponent = PendingChallengesComponent(
      getAddressById(components, PendingChallengesComponentID)
    );

    uint256[] memory pendingChallenges = pendingChallengesComponent.getValue(entity);

    // Removes the component if there is only one pending challenge left, otherwise extracts
    // it from the array
    // The second part of this conditional ensures that someone can't remove the last 
    // pending challenge by passing a challengeTilesEntity value that doesn't correspond to it. 
    // The else body effectively does nothing if the provided challengeTilesEntity isn't actually 
    // in the array
    if (pendingChallenges.length == 1 && pendingChallenges[0] == challengeTilesEntity) {
      pendingChallengesComponent.remove(entity);
    } else {
      uint256[] memory newPendingChallenges = new uint256[](pendingChallenges.length - 1);
      uint256 assignIndex = 0;
      for (uint256 i = 0; i < pendingChallenges.length; ++i) {
        if (pendingChallenges[i] != challengeTilesEntity) {
          newPendingChallenges[assignIndex] = pendingChallenges[i];
          ++assignIndex;
        }
      }
      pendingChallengesComponent.set(entity, newPendingChallenges);
    }

    // It is important that the challenge tiles entity pending challenge count is decremented 
    // after the pending challenge is removed rather than before, so that the client can respond 
    // to the removal of the pending challenge and still have access to the associated challenge
    // tiles, in case they are removed when the pending challenge count is decremented
    decreasePendingChallengeCount(components, challengeTilesEntity);
  }

  // Removes all pending challenges that exist for the supplied entity
  function clear(IUint256Component components, uint256 entity) internal {
    PendingChallengesComponent pendingChallengesComponent = PendingChallengesComponent(
      getAddressById(components, PendingChallengesComponentID)
    );

    if (pendingChallengesComponent.has(entity)) {
      uint256[] memory pendingChallenges = pendingChallengesComponent.getValue(entity);
      pendingChallengesComponent.remove(entity);
      for (uint256 i = 0; i < pendingChallenges.length; ++i) {
        decreasePendingChallengeCount(components, pendingChallenges[i]);
      }
    }
  }

  function decreasePendingChallengeCount(
    IUint256Component components, uint256 challengeTilesEntity
  ) internal {
    PendingChallengeCountComponent pendingChallengeCountComponent = PendingChallengeCountComponent(
      getAddressById(components, PendingChallengeCountComponentID)
    );

    // Destroys challengeTilesEntity if there are no more pending challenges for it, otherwise just 
    // decrements the pending challenge count
    uint256 pendingChallengeCount = pendingChallengeCountComponent.getValue(challengeTilesEntity);
    if (pendingChallengeCount == 1) {
      pendingChallengeCountComponent.remove(challengeTilesEntity);
      ChallengeTilesComponent(
        getAddressById(components, ChallengeTilesComponentID)
      ).remove(challengeTilesEntity);
    } else {
      pendingChallengeCountComponent.set(challengeTilesEntity, pendingChallengeCount - 1);
    }
  }
}
