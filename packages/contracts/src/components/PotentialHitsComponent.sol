// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "std-contracts/components/Uint256ArrayComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.PotentialHits"));

// Mapping from entity to entity ids of the hit tiles entities that are potential hits
contract PotentialHitsComponent is Uint256ArrayComponent {
  constructor(address world) Uint256ArrayComponent(world, ID) {}
}
