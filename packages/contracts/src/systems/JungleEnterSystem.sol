// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {MoveSystem, Position} from "./MoveSystem.sol";
import {PositionCommitmentVerifier} from "../dependencies/PositionCommitmentVerifier.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {getAddressById} from "solecs/utils.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.JungleEnter"));

contract JungleEnterSystem is MoveSystem {
  PositionCommitmentVerifier positionCommitmentVerifier;
  JungleMoveCountComponent jungleMoveCountComponent;

  constructor(
    IWorld _world,
    address _components, 
    address positionCommitmentVerifierAddress
  ) MoveSystem(_world, _components) {
    positionCommitmentVerifier = PositionCommitmentVerifier(positionCommitmentVerifierAddress);
    jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, Position memory newPosition, uint256 commitment, uint256[8] memory proofData) = 
      abi.decode(arguments, (uint256, Position, uint256, uint256[8]));
    executeTyped(entity, newPosition, commitment, proofData);
  }

  function executeTyped(
    uint256 entity, 
    Position memory newPosition, 
    uint256 commitment, 
    uint256[8] memory proofData
  ) public returns (bytes memory) {
    positionCommitmentVerifier.verifyProof(proofData, [commitment, newPosition.x, newPosition.y]);

    super.move(entity, newPosition, TileType.PLAINS, TileType.JUNGLE);
    positionCommitmentComponent.set(entity, commitment);
    jungleMoveCountComponent.set(entity, 1); // Set to 1 so that client can update in response
  }
}
