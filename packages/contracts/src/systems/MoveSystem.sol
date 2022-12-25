// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import { IWorld } from "solecs/interfaces/IWorld.sol";
import { getAddressById } from "solecs/utils.sol";

import {MapDataComponent, ID as MapDataComponentID, TileType} from "../components/MapDataComponent.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {PositionCommitmentComponent, ID as PositionCommitmentComponentID} from "../components/PositionCommitmentComponent.sol";
import {MAP_SIZE} from "../Constants.sol";

function absDiff(uint16 a, uint16 b) pure returns (uint16) {
    return a > b ? a - b : b - a;
}

uint256 constant ID = uint256(keccak256("zkhunt.system.Move"));

abstract contract MoveSystem is System {
  MapDataComponent internal mapDataComponent;
  PositionComponent internal positionComponent;
  PositionCommitmentComponent internal positionCommitmentComponent;
  
  constructor(IWorld _world, address _components) System(_world, _components) {
    mapDataComponent = MapDataComponent(getAddressById(components, MapDataComponentID));
    positionComponent = PositionComponent(getAddressById(components, PositionComponentID));
    positionCommitmentComponent = PositionCommitmentComponent(
      getAddressById(components, PositionCommitmentComponentID)
    );
  }

  function moveFrom(
    uint256 entity, 
    Position memory oldPosition, 
    Position memory newPosition, 
    TileType fromTileType, 
    TileType toTileType
  ) internal {
    // Move doesn't exceed map bounds
    require(
      newPosition.x < MAP_SIZE && newPosition.y < MAP_SIZE,
      "Invalid move: move exceeds map bounds"
    );

    // Move is from correct tile type
    require(
      mapDataComponent.getMapTileValue(oldPosition) == fromTileType, 
      "Invalid move: move from incorrect tile type"
    );
    
    // Move is onto correct tile type
    require(
      mapDataComponent.getMapTileValue(newPosition) == toTileType, 
      "Invalid move: move onto incorrect tile type"
    );

    // Move is only a single orthogonal step
    require(
      absDiff(newPosition.x, oldPosition.x) + absDiff(newPosition.y, oldPosition.y) == 1,
      "Invalid move: move isn't a single orthogonal step"
    );

    positionComponent.set(entity, newPosition);
  }

  function move(
    uint256 entity, 
    Position memory newPosition, 
    TileType fromTileType, 
    TileType toTileType
  ) internal {
    moveFrom(entity, positionComponent.getValue(entity), newPosition, fromTileType, toTileType);
  }
}
