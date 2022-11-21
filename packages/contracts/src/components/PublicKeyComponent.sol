// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "std-contracts/components/Uint256ArrayComponent.sol";
import "solecs/LibQuery.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.PublicKey"));

// Public key is two field elements
contract PublicKeyComponent is Uint256ArrayComponent {
  constructor(address world) Uint256ArrayComponent(world, ID) {}
}
