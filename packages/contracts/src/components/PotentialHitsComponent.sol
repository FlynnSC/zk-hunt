// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "std-contracts/components/Uint256ArrayComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.PotentialHits"));

// Mapping from entity to entity ids of the hit tiles entities that are potential hits
contract PotentialHitsComponent is Uint256ArrayComponent {
  constructor(address world) Uint256ArrayComponent(world, ID) {}

  function addPotentialHit(uint256 entity, uint256 hitTilesEntity) public {
    uint256[] memory newPotentialHits;
    if (has(entity)) {
      uint256[] memory oldPotentialHits = getValue(entity);
      newPotentialHits = new uint256[](oldPotentialHits.length - 1);
      for (uint256 i = 0; i < oldPotentialHits.length; ++i) {
        newPotentialHits[i] = oldPotentialHits[i];
      }
      newPotentialHits[oldPotentialHits.length] = hitTilesEntity;
    } else {
      newPotentialHits = new uint256[](1);
      newPotentialHits[0] = hitTilesEntity;
    }
    set(entity, newPotentialHits);
  }

  // Assumes that the supplied hitTilesEntity already exists in the array
  function removePotentialHit(uint256 entity, uint256 hitTilesEntity) public {
    uint256[] memory potentialHits = getValue(entity);

    // Removes the component if there is only one potential hit left, otherwise extracts
    // it from the array
    // The second part of this conditional ensures that someone can't remove the last 
    // potential hit by passing a hitTilesEntity value that doesn't correspond to it. The
    // else body effectively does nothing if the provided hitTilesEntity isn't actually in
    // the array
    if (potentialHits.length == 1 && potentialHits[0] == hitTilesEntity) {
      remove(entity);
    } else {
      uint256[] memory newPotentialHits = new uint256[](potentialHits.length - 1);
      uint256 assignIndex = 0;
      for (uint256 i = 0; i < potentialHits.length; ++i) {
        if (potentialHits[i] != hitTilesEntity) {
          newPotentialHits[assignIndex] = potentialHits[i];
          ++assignIndex;
        }
      }
    }
  }
}
