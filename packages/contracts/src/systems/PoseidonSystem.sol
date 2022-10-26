// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import { IWorld } from "solecs/interfaces/IWorld.sol";
import { getAddressById } from "solecs/utils.sol";

import {MapDataComponent, ID as MapDataComponentID, TileType} from "../components/MapDataComponent.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {ControlledByComponent, ID as ControlledByComponentID} from "../components/ControlledByComponent.sol";
import {MAP_SIZE} from "../Constants.sol";

interface Poseidon2Contract {
    function poseidon(uint256[2] memory inputs) external virtual returns (uint256);
}

interface Poseidon3Contract {
    function poseidon(uint256[3] memory inputs) external virtual returns (uint256);
}

uint256 constant ID = uint256(keccak256("zkhunt.system.Poseidon"));

contract PoseidonSystem is System {
  Poseidon2Contract poseidon2Contract;
  Poseidon3Contract poseidon3Contract;

  constructor(
    IWorld _world, 
    address _components,
    address poseidon2ContractAddress,
    address poseidon3ContractAddress
  ) System(_world, _components) {
    poseidon2Contract = Poseidon2Contract(poseidon2ContractAddress);
    poseidon3Contract = Poseidon3Contract(poseidon3ContractAddress);
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint8 argCount, bytes memory args) = abi.decode(arguments, (uint8, bytes));
    if (argCount == 2) {
      (uint256 a, uint256 b) = abi.decode(args, (uint256, uint256));
      return abi.encode(poseidon2(a, b));
    } else if (argCount == 3) {
      (uint256 a, uint256 b, uint256 c) = abi.decode(args, (uint256, uint256, uint256));
      return abi.encode(poseidon3(a, b, c));
    } else {
      revert("PoseidonSystem: Invalid argCount passed");
    }    
  }

  // TODO yeah this is probably dumb, but whatever
  function poseidon2(uint256 a, uint256 b) public returns (uint256) {
    return poseidon2Contract.poseidon([a, b]);
  }

  function poseidon3(uint256 a, uint256 b, uint256 c) public returns (uint256) {
    return poseidon3Contract.poseidon([a, b, c]);
  }
}
