// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {PendingChallengesComponent, ID as PendingChallengesComponentID} from "../components/PendingChallengesComponent.sol";
import {ChallengeTilesComponent, ID as ChallengeTilesComponentID} from "../components/ChallengeTilesComponent.sol";
import {getAddressById} from "solecs/utils.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.PendingChallengeUpdate"));

enum UpdateType {
  ADD,
  REMOVE,
  CLEAR
}

contract PendingChallengeUpdateSystem is System {
  // Used to track whether a challengeTiles entity can be removed once all the associated pending  
  // challenges have been removed
  mapping (uint256 => uint256) private challengeTilesEntityToPendingChallengeCount;
  PendingChallengesComponent pendingChallengesComponent;
  ChallengeTilesComponent challengeTilesComponent;

  constructor(IWorld _world, address _components) System(_world, _components) {
    pendingChallengesComponent = PendingChallengesComponent(
      getAddressById(components, PendingChallengesComponentID)
    );
    challengeTilesComponent = ChallengeTilesComponent(
      getAddressById(components, ChallengeTilesComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 challengeTilesEntity, UpdateType updateType) = 
      abi.decode(arguments, (uint256, uint256, UpdateType));
    executeTyped(entity, challengeTilesEntity, updateType);
  }

  // challengeTilesEntity can be 0 if updateType is CLEAR
  function executeTyped(uint256 entity, uint256 challengeTilesEntity, UpdateType updateType) public {
    if (updateType == UpdateType.ADD) {
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
      challengeTilesEntityToPendingChallengeCount[challengeTilesEntity] += 1;
    } else if (updateType == UpdateType.REMOVE) {
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
      decreaseChallengeTilesEntityPendingChallengeCount(challengeTilesEntity);
    } else {
      // Removes all pending challenges that existed for the supplied entity
      if (pendingChallengesComponent.has(entity)) {
        uint256[] memory pendingChallenges = pendingChallengesComponent.getValue(entity);
        for (uint256 i = 0; i < pendingChallenges.length; ++i) {
          decreaseChallengeTilesEntityPendingChallengeCount(pendingChallenges[i]);
          pendingChallengesComponent.remove(entity);
        }
      }
    }
  }

  function decreaseChallengeTilesEntityPendingChallengeCount(uint256 challengeTilesEntity) private {
    // Destroys challengeTilesEntity if there are no more pending challenges for it
    challengeTilesEntityToPendingChallengeCount[challengeTilesEntity] -= 1;
    if (challengeTilesEntityToPendingChallengeCount[challengeTilesEntity] == 0) {
      challengeTilesComponent.remove(challengeTilesEntity);
    }
  }
}
