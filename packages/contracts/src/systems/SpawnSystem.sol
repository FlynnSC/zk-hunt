// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import { IWorld } from "solecs/interfaces/IWorld.sol";
import { getAddressById, addressToEntity } from "solecs/utils.sol";

import {MapDataComponent, ID as MapDataComponentID, TileType} from "../components/MapDataComponent.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {ControlledByComponent, ID as ControlledByComponentID} from "../components/ControlledByComponent.sol";
import {PublicKeyComponent, ID as PublicKeyComponentID} from "../components/PublicKeyComponent.sol";
import {MAP_SIZE} from "../Constants.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.Spawn"));

contract SpawnSystem is System {
  MapDataComponent mapDataComponent;
  PositionComponent positionComponent;
  ControlledByComponent controlledByComponent;
  PublicKeyComponent publicKeyComponent;
  
  constructor(IWorld _world, address _components) System(_world, _components) {
    mapDataComponent = MapDataComponent(getAddressById(components, MapDataComponentID));
    positionComponent = PositionComponent(getAddressById(components, PositionComponentID));
    controlledByComponent = ControlledByComponent(
      getAddressById(components, ControlledByComponentID)
    );
    publicKeyComponent = PublicKeyComponent(getAddressById(components, PublicKeyComponentID));
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256[] memory publicKey) = abi.decode(arguments, (uint256[]));
    return abi.encode(executeTyped(publicKey));
  }

  function executeTyped(uint256[] memory publicKey) public returns (uint256) {        
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
    controlledByComponent.set(entity, msg.sender);
    // TODO Make it so that this happens when a player registers for the game, rather than when they
    // spawn an entity
    publicKeyComponent.set(addressToEntity(msg.sender), publicKey);
    positionComponent.set(entity, spawnPosition);
    return entity;
  }
}
