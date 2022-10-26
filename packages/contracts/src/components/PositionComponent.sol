// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/Component.sol";

struct Position {
  uint8 x;
  uint8 y;
}

uint256 constant ID = uint256(keccak256("zkhunt.component.Position"));

contract PositionComponent is Component {
  constructor(address world) Component(world, ID) {}

  function getSchema() public pure override returns (string[] memory keys, LibTypes.SchemaValue[] memory values) {
    keys = new string[](2);
    values = new LibTypes.SchemaValue[](2);

    keys[0] = "x";
    values[0] = LibTypes.SchemaValue.UINT8;

    keys[1] = "y";
    values[1] = LibTypes.SchemaValue.UINT8;
  }

  function set(uint256 entity, Position calldata value) public {
    set(entity, abi.encode(value));
  }

  function getValue(uint256 entity) public view returns (Position memory) {
    (uint8 x, uint8 y) = abi.decode(getRawValue(entity), (uint8, uint8));
    return Position(x, y);
  }

  function getEntitiesWithValue(Position calldata position) public view returns (uint256[] memory) {
    return getEntitiesWithValue(abi.encode(position));
  }
}

