// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/Component.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.RevealedPotentialPositions"));

struct PotentialPositions {
  uint8[] xValues;
  uint8[] yValues;
}

contract RevealedPotentialPositionsComponent is Component {
  constructor(address world) Component(world, ID) {}

  function getSchema() public pure override returns (string[] memory keys, LibTypes.SchemaValue[] memory values) {
    keys = new string[](2);
    values = new LibTypes.SchemaValue[](2);

    keys[0] = "xValues";
    values[0] = LibTypes.SchemaValue.UINT8_ARRAY;

    keys[1] = "yValues";
    values[1] = LibTypes.SchemaValue.UINT8_ARRAY;
  }

  // TODO figure out why encoding and decoding the struct directly doesn't work on the client
  function set(uint256 entity, PotentialPositions memory value) public {
    // set(entity, abi.encode(value));
    set(entity, abi.encode(value.xValues, value.yValues));
  }

  function getValue(uint256 entity) public view returns (PotentialPositions memory) {
    // return abi.decode(getRawValue(entity), (PotentialPositions));
    (uint8[] memory xValues, uint8[] memory yValues) = 
      abi.decode(getRawValue(entity), (uint8[], uint8[]));
    return PotentialPositions(xValues, yValues);
  }
}
