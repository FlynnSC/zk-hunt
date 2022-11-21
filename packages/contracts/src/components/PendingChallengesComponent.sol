// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "std-contracts/components/Uint256ArrayComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.PendingChallenges"));

// Mapping from entity to entity ids of the challenge tiles entities that are pending challenges
contract PendingChallengesComponent is Uint256ArrayComponent {
  constructor(address world) Uint256ArrayComponent(world, ID) {}
}
