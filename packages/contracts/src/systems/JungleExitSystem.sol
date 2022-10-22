// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {MoveSystem, Position} from "./MoveSystem.sol";
import {getAddressById} from "solecs/utils.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";

interface PoseidonContract {
    function poseidon(uint256[3] memory inputs) external virtual returns (uint256);
}

uint256 constant ID = uint256(keccak256("zkhunt.system.JungleExit"));

contract JungleExitSystem is MoveSystem {
  PoseidonContract poseidonContract;
  JungleMoveCountComponent jungleMoveCountComponent;

  constructor(
    IWorld _world, 
    address _components,
    address poseidonContractAddress
  ) MoveSystem(_world, _components) {
    poseidonContract = PoseidonContract(poseidonContractAddress);
    jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (
      uint256 entity, 
      Position memory oldPosition, 
      uint256 oldPositionNonce, 
      Position memory newPosition
    ) = abi.decode(arguments, (uint256, Position, uint256, Position));
    executeTyped(entity, oldPosition, oldPositionNonce, newPosition);
  }

  function executeTyped(
    uint256 entity, 
    Position memory oldPosition, 
    uint256 oldPositionNonce,
    Position memory newPosition
  ) public returns (bytes memory) {
    require(
      poseidonContract.poseidon([oldPosition.x, oldPosition.y, oldPositionNonce]) == 
        positionCommitmentComponent.getValue(entity),
      "Hash of old position and old nonce does not match the stored commitment"
    );

    super.moveFrom(entity, oldPosition, newPosition, TileType.JUNGLE, TileType.PLAINS);

    // Set to 0 so that players can no longer call jungleMove until they enter a jungle tile again
    positionCommitmentComponent.set(entity, 0);
    jungleMoveCountComponent.set(entity, 0);
  }
}
