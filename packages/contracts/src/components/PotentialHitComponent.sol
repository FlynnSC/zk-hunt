// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "std-contracts/components/Uint256Component.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.PotentialHit"));

// Mapping from entity to entity id of the hit tiles
contract PotentialHitComponent is Uint256Component {
  constructor(address world) Uint256Component(world, ID) {}
}
