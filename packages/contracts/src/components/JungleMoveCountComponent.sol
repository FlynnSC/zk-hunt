// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "std-contracts/components/Uint256Component.sol";
import "solecs/LibQuery.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.JungleMoveCount"));

contract JungleMoveCountComponent is Uint256Component {
  constructor(address world) Uint256Component(world, ID) {}
}
