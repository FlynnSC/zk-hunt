// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/Component.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.ChallengeTiles"));

struct ChallengeTileSet {
  uint8[] xValues;
  uint8[] yValues;
  uint256 merkleRoot;
  address challenger;
}

contract ChallengeTilesComponent is Component {
  constructor(address world) Component(world, ID) {}

  function getSchema() public pure override returns (string[] memory keys, LibTypes.SchemaValue[] memory values) {
    keys = new string[](4);
    values = new LibTypes.SchemaValue[](4);

    keys[0] = "xValues";
    values[0] = LibTypes.SchemaValue.UINT8_ARRAY;

    keys[1] = "yValues";
    values[1] = LibTypes.SchemaValue.UINT8_ARRAY;

    keys[2] = "merkleRoot";
    values[2] = LibTypes.SchemaValue.UINT256;

    keys[3] = "challenger";
    values[3] = LibTypes.SchemaValue.ADDRESS;
  }

  // TODO figure out why encoding and decoding the struct directly doesn't work on the client
  function set(uint256 entity, ChallengeTileSet memory value) public {
    // set(entity, abi.encode(value));
    set(entity, abi.encode(value.xValues, value.yValues, value.merkleRoot, value.challenger));
  }

  function getValue(uint256 entity) public view returns (ChallengeTileSet memory) {
    // return abi.decode(getRawValue(entity), (ChallengeTileSet));
    (uint8[] memory xValues, uint8[] memory yValues, uint256 merkleRoot, address challenger) = 
      abi.decode(getRawValue(entity), (uint8[], uint8[], uint256, address));
    return ChallengeTileSet(xValues, yValues, merkleRoot, challenger);
  }
}
