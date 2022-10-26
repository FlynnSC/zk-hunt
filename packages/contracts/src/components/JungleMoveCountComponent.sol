// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "std-contracts/components/Uint256Component.sol";
import "solecs/LibQuery.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.JungleMoveCount"));

contract JungleMoveCountComponent is Uint256Component {
  constructor(address world) Uint256Component(world, ID) {}

  function isEntityInJungle(uint256 entity) public returns (bool) {
    return has(entity) && getValue(entity) != 0;
  }

  function getEntitiesInJungle() public returns (uint256[] memory) {
    QueryFragment[] memory fragments = new QueryFragment[](2);
    fragments[0] = QueryFragment(QueryType.Has, this, new bytes(0));
    fragments[1] = QueryFragment(QueryType.NotValue, this, abi.encode(uint256(0)));
    return LibQuery.query(fragments);
  }
}
