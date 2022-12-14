// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {MoveSystem, Position} from "./MoveSystem.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "./PoseidonSystem.sol";
import {RevealedPotentialPositionsComponent, ID as RevealedPotentialPositionsComponentID} from "../components/RevealedPotentialPositionsComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.JungleExit"));

contract JungleExitSystem is MoveSystem {
  JungleMoveCountComponent jungleMoveCountComponent;
  PoseidonSystem poseidonSystem;
  RevealedPotentialPositionsComponent revealedPotentialPositionsComponent;

  constructor(
    IWorld _world, 
    address _components
  ) MoveSystem(_world, _components) {
    jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );
    poseidonSystem = PoseidonSystem(getSystemAddressById(components, PoseidonSystemID));
    revealedPotentialPositionsComponent = RevealedPotentialPositionsComponent(
      getAddressById(components, RevealedPotentialPositionsComponentID)
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
    require(jungleMoveCountComponent.has(entity), "Player is not inside the jungle");

    require(
      poseidonSystem.poseidon3(oldPosition.x, oldPosition.y, oldPositionNonce) == 
        positionCommitmentComponent.getValue(entity),
      "Hash of old position and old nonce does not match the stored commitment"
    );

    super.moveFrom(entity, oldPosition, newPosition, TileType.JUNGLE, TileType.PLAINS);

    jungleMoveCountComponent.remove(entity);
    revealedPotentialPositionsComponent.remove(entity);
  }
}
