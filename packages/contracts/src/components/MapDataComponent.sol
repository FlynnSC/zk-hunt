// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "std-contracts/components/Uint256Component.sol";
import {Position} from "./PositionComponent.sol";
import {GodID, MAP_SIZE} from "../Constants.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.MapData"));

enum TileType {
  PLAINS,
  JUNGLE
}

contract MapDataComponent is Uint256Component {
  constructor(address world) Uint256Component(world, ID) {
    set(GodID, uint256(0x1E07380C700882060F043F00FC23F8E0A0C001806030007830F0E001C));
  }

  function getMapTileValue(Position memory position) public view returns (TileType) {
    return TileType(
      (getValue(GodID) >> (uint256(position.x) + uint256(position.y) * MAP_SIZE) & 1)
    );
  }
}
