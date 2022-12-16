// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import { IWorld } from "solecs/interfaces/IWorld.sol";
import { getAddressById, getSystemAddressById } from "solecs/utils.sol";
import {MapDataComponent, ID as MapDataComponentID, TileType, MapData} from "../components/MapDataComponent.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "./PoseidonSystem.sol";
import {MAP_SIZE, GodID} from "../Constants.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.Init"));

contract InitSystem is System {
  PoseidonSystem poseidonSystem;

  constructor(IWorld _world, address _components) System(_world, _components) {
    poseidonSystem = PoseidonSystem(
      getSystemAddressById(components, PoseidonSystemID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256[] memory chunks) = abi.decode(arguments, (uint256[]));
    return abi.encode(executeTyped(chunks));
  }

  // Assumes that the number of chunks are a power of 2 (padded with 0 chunks on the client if 
  // necessary)
  function executeTyped(uint256[] memory chunks) public returns (uint256) {        
    MapDataComponent mapDataComponent = MapDataComponent(
      getAddressById(components, MapDataComponentID)
    );

    mapDataComponent.set(GodID, MapData(chunks, calcRoot(chunks, chunks.length, 0)));
  }

  function calcRoot(
    uint256[] memory chunks, uint256 subTreeLeafCount, uint256 currIndex
  ) private returns (uint256) {
    if (subTreeLeafCount == 2) {
      return poseidonSystem.poseidon2(chunks[currIndex], chunks[currIndex + 1]);
    } else {
      uint256 newSubTreeLeafCount = subTreeLeafCount / 2;
      return poseidonSystem.poseidon2(
        calcRoot(chunks, newSubTreeLeafCount, currIndex),
        calcRoot(chunks, newSubTreeLeafCount, currIndex + newSubTreeLeafCount)
      );
    }
  }
}
