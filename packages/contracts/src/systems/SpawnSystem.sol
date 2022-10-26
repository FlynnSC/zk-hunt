// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import { IWorld } from "solecs/interfaces/IWorld.sol";
import { getAddressById } from "solecs/utils.sol";

import {MapDataComponent, ID as MapDataComponentID, TileType} from "../components/MapDataComponent.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {ControlledByComponent, ID as ControlledByComponentID} from "../components/ControlledByComponent.sol";
import {MAP_SIZE} from "../Constants.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.Spawn"));

contract SpawnSystem is System {
  MapDataComponent internal mapDataComponent;
  PositionComponent internal positionComponent;
  ControlledByComponent internal controlledByComponent;
  
  constructor(IWorld _world, address _components) System(_world, _components) {
    mapDataComponent = MapDataComponent(getAddressById(components, MapDataComponentID));
    positionComponent = PositionComponent(getAddressById(components, PositionComponentID));
    controlledByComponent = ControlledByComponent(
      getAddressById(components, ControlledByComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (address controller) = abi.decode(arguments, (address));
    return abi.encode(executeTyped(controller));
  }

  function executeTyped(address controller) public returns (uint256) {        
    // TODO better random oracle (block.difficulty?)
    uint256 randomSeed = uint256(keccak256(abi.encode(block.timestamp)));
    Position memory spawnPosition;

    // Tries new random positions until a plains tile is chosen
    while (true) {
      // TODO undo
      spawnPosition.x = 2; //uint8(randomSeed % MAP_SIZE);
      spawnPosition.y = 2; //uint8((randomSeed >> 8) % MAP_SIZE);

      if (mapDataComponent.getMapTileValue(spawnPosition) == TileType.PLAINS) {
        break;
      }

      unchecked { ++randomSeed; }
    }

    uint256 entity = world.getUniqueEntityId();
    positionComponent.set(entity, spawnPosition);
    controlledByComponent.set(entity, controller);
    return entity;
  }
}
