// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "std-contracts/components/Uint256Component.sol"; 

uint256 constant ID = uint256(keccak256("zkhunt.component.PendingChallengeCount"));

// Maps challenge tile entities to the number of pending challenges that they are related to
contract PendingChallengeCountComponent is Uint256Component {
  constructor(address world) Uint256Component(world, ID) {}
}
