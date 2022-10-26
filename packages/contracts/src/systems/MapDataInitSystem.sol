// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import { IWorld } from "solecs/interfaces/IWorld.sol";
import { getAddressById, getSystemAddressById } from "solecs/utils.sol";

import {MapDataComponent, ID as MapDataComponentID, TileType, MapData} from "../components/MapDataComponent.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "./PoseidonSystem.sol";
import {MAP_SIZE, GodID} from "../Constants.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.MapDataInit"));

contract MapDataInitSystem is System {
  constructor(IWorld _world, address _components) System(_world, _components) {}

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256[] memory chunks) = abi.decode(arguments, (uint256[]));
    return abi.encode(executeTyped(chunks));
  }

  function executeTyped(uint256[] memory chunks) public returns (uint256) {        
    MapDataComponent mapDataComponent = MapDataComponent(
      getAddressById(components, MapDataComponentID)
    );
    PoseidonSystem poseidonSystem = PoseidonSystem(
      getSystemAddressById(components, PoseidonSystemID)
    );

    // // TODO represent whole thing as single tree stored in array rather than 3 seperate fields
    // // TODO make better impl?
    // uint256 rowNodeCount = chunks.length / 2;
    // uint256 accNodeCount = 0;
    // uint256 prevAccNodeCount = 0;
    // uint256[] memory intermediaryNodes = new uint256[](2 * rowNodeCount - 2);
    // while (rowNodeCount > 1) {
    //   for (uint256 i = 0; i < rowNodeCount; ++i) {
    //     if (rowNodeCount == chunks.length / 2) {
    //       intermediaryNodes[accNodeCount + i] = poseidonSystem.poseidon2(
    //         chunks[2 * i], chunks[2 * i + 1]
    //       );
    //     } else {
    //       intermediaryNodes[accNodeCount + i] = poseidonSystem.poseidon2(
    //         intermediaryNodes[prevAccNodeCount + 2 * i], 
    //         intermediaryNodes[prevAccNodeCount + 2 * i + 1]
    //       );
    //     }
    //   }
    //   prevAccNodeCount = accNodeCount;
    //   accNodeCount += rowNodeCount;
    //   rowNodeCount /= 2;
    // }

    uint256[] memory intermediaryNodes = new uint256[](2);
    intermediaryNodes[0] = poseidonSystem.poseidon2(chunks[0], chunks[1]);
    intermediaryNodes[1] = poseidonSystem.poseidon2(chunks[2], chunks[3]);
    uint256 root = poseidonSystem.poseidon2(
      intermediaryNodes[intermediaryNodes.length - 2], 
      intermediaryNodes[intermediaryNodes.length - 1]
    );
    mapDataComponent.set(GodID, MapData({
      chunks: chunks,
      intermediaryNodes: intermediaryNodes,
      root: root
    }));
  }
}
