// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById} from "solecs/utils.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {PositionCommitmentComponent, ID as PositionCommitmentComponentID} from "../components/PositionCommitmentComponent.sol";
import {PositionCommitmentVerifier} from "../dependencies/PositionCommitmentVerifier.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.AssertPosition"));

// Asserts supplied position matches the commitment without revealing the private nonce
contract AssertPositionSystem is System {
  PositionComponent positionComponent;
  PositionCommitmentComponent positionCommitmentComponent;
  JungleMoveCountComponent jungleMoveCountComponent;
  PositionCommitmentVerifier positionCommitmentVerifier;

  constructor(
    IWorld _world, 
    address _components,
    address positionCommitmentVerifierAddress
  ) System(_world, _components) {
    positionComponent = PositionComponent(getAddressById(components, PositionComponentID));
    positionCommitmentComponent = PositionCommitmentComponent(
      getAddressById(components, PositionCommitmentComponentID)
    );
    jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );
    positionCommitmentVerifier = PositionCommitmentVerifier(positionCommitmentVerifierAddress);
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, Position memory position, uint256[8] memory proofData) = 
      abi.decode(arguments, (uint256, Position, uint256[8]));
    executeTyped(entity, position, proofData);
  }

  // TODO probably look at structure of position revealing (with and without nonce), what
  // systems need the logic, and refactor this?

  function executeTyped(
    uint256 entity, 
    Position memory position,
    uint256[8] memory proofData
  ) public returns (bytes memory) {
    require(jungleMoveCountComponent.has(entity), "Player is not inside the jungle");

    positionCommitmentVerifier.verifyProof(
      proofData, 
      [positionCommitmentComponent.getValue(entity), position.x, position.y]
    );

    positionComponent.set(entity, position);
    jungleMoveCountComponent.set(entity, 1);
  }
}
