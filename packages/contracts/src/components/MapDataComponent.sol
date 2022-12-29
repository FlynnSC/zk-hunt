// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "solecs/Component.sol";
import {Position} from "./PositionComponent.sol";
import {GodID, MAP_SIZE} from "../Constants.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.MapData"));

  enum TileType {
    PLAINS,
    JUNGLE
  }

  struct MapData {
    uint256[] chunks;
    uint256 root;
  }

contract MapDataComponent is Component {
  uint256 constant tilesPerChunk = 253;

  constructor(address world) Component(world, ID) {}

  function getSchema() public pure override returns (string[] memory keys, LibTypes.SchemaValue[] memory values) {
    keys = new string[](2);
    values = new LibTypes.SchemaValue[](2);

    keys[0] = "chunks";
    values[0] = LibTypes.SchemaValue.UINT256_ARRAY;

    keys[1] = "root";
    values[1] = LibTypes.SchemaValue.UINT256;
  }

  function set(uint256 entity, MapData memory value) public {
    set(entity, abi.encode(value.chunks, value.root));
  }

  function getValue(uint256 entity) public view returns (MapData memory) {
    (uint256[] memory chunks, uint256 root) =
    abi.decode(getRawValue(entity), (uint256[], uint256));
    return MapData(chunks, root);
  }

  function getMapTileValue(Position memory position) public view returns (TileType) {
    MapData memory mapData = getValue(GodID);
    uint256 tileIndex = uint256(position.x) + uint256(position.y) * MAP_SIZE;
    uint256 chunk = mapData.chunks[tileIndex / tilesPerChunk];

    return TileType((chunk >> (tileIndex % tilesPerChunk)) & 0x1);
  }
}
