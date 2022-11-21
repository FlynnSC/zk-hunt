// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {PotentialHitsComponent, ID as PotentialHitsComponentID} from "../components/PotentialHitsComponent.sol";
import {HitTilesComponent, ID as HitTilesComponentID} from "../components/HitTilesComponent.sol";
import {getAddressById} from "solecs/utils.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.PotentialHitUpdate"));

enum UpdateType {
  ADD,
  REMOVE,
  CLEAR
}

contract PotentialHitUpdateSystem is System {
  // Used to track whether a hitTiles entity can be removed once all the associated potential 
  // hits have been removed
  mapping (uint256 => uint256) private hitTilesEntityToPotentialHitCount;
  PotentialHitsComponent potentialHitsComponent;
  HitTilesComponent hitTilesComponent;

  constructor(IWorld _world, address _components) System(_world, _components) {
    potentialHitsComponent = PotentialHitsComponent(
      getAddressById(components, PotentialHitsComponentID)
    );
    hitTilesComponent = HitTilesComponent(
      getAddressById(components, HitTilesComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 hitTilesEntity, UpdateType updateType) = 
      abi.decode(arguments, (uint256, uint256, UpdateType));
    executeTyped(entity, hitTilesEntity, updateType);
  }

  // hitTilesEntity can be 0 if updateType is CLEAR
  function executeTyped(uint256 entity, uint256 hitTilesEntity, UpdateType updateType) public {
    if (updateType == UpdateType.ADD) {
      uint256[] memory newPotentialHits;
      if (potentialHitsComponent.has(entity)) {
        uint256[] memory oldPotentialHits = potentialHitsComponent.getValue(entity);
        newPotentialHits = new uint256[](oldPotentialHits.length + 1);
        for (uint256 i = 0; i < oldPotentialHits.length; ++i) {
          newPotentialHits[i] = oldPotentialHits[i];
        }
        newPotentialHits[oldPotentialHits.length] = hitTilesEntity;
      } else {
        newPotentialHits = new uint256[](1);
        newPotentialHits[0] = hitTilesEntity;
      }
      potentialHitsComponent.set(entity, newPotentialHits);
      hitTilesEntityToPotentialHitCount[hitTilesEntity] += 1;
    } else if (updateType == UpdateType.REMOVE) {
      uint256[] memory potentialHits = potentialHitsComponent.getValue(entity);

      // Removes the component if there is only one potential hit left, otherwise extracts
      // it from the array
      // The second part of this conditional ensures that someone can't remove the last 
      // potential hit by passing a hitTilesEntity value that doesn't correspond to it. The
      // else body effectively does nothing if the provided hitTilesEntity isn't actually in
      // the array
      if (potentialHits.length == 1 && potentialHits[0] == hitTilesEntity) {
        potentialHitsComponent.remove(entity);
      } else {
        uint256[] memory newPotentialHits = new uint256[](potentialHits.length - 1);
        uint256 assignIndex = 0;
        for (uint256 i = 0; i < potentialHits.length; ++i) {
          if (potentialHits[i] != hitTilesEntity) {
            newPotentialHits[assignIndex] = potentialHits[i];
            ++assignIndex;
          }
        }
        potentialHitsComponent.set(entity, newPotentialHits);
      }

      decreaseHitTilesEntityPotentialHitCount(hitTilesEntity);
    } else {
      // Removes all potential hits that existed for the supplied entity
      if (potentialHitsComponent.has(entity)) {
        uint256[] memory potentialHits = potentialHitsComponent.getValue(entity);
        for (uint256 i = 0; i < potentialHits.length; ++i) {
          decreaseHitTilesEntityPotentialHitCount(potentialHits[i]);
          potentialHitsComponent.remove(entity);
        }
      }
    }
  }

  function decreaseHitTilesEntityPotentialHitCount(uint256 hitTilesEntity) private {
    // Destroys hitTilesEntity if there are no more potential hits for it
    hitTilesEntityToPotentialHitCount[hitTilesEntity] -= 1;
    if (hitTilesEntityToPotentialHitCount[hitTilesEntity] == 0) {
      hitTilesComponent.remove(hitTilesEntity);
    }
  }
}
