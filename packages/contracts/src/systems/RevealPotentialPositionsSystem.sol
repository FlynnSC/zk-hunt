// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "./PoseidonSystem.sol";
import {
  RevealedPotentialPositionsComponent, 
  ID as RevealedPotentialPositionsComponentID, 
  PotentialPositions
} from "../components/RevealedPotentialPositionsComponent.sol";
import {PotentialPositionsRevealVerifier} from "../dependencies/PotentialPositionsRevealVerifier.sol";
import {PositionCommitmentComponent, ID as PositionCommitmentComponentID} from "../components/PositionCommitmentComponent.sol";
import {ActionLib} from "../libraries/ActionLib.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.RevealPotentialPositions"));

contract RevealPotentialPositionsSystem is System {
  JungleMoveCountComponent jungleMoveCountComponent;
  PoseidonSystem poseidonSystem;
  RevealedPotentialPositionsComponent revealedPotentialPositionsComponent;
  PotentialPositionsRevealVerifier potentialPositionsRevealVerifier;
  PositionCommitmentComponent positionCommitmentComponent;

  constructor(
    IWorld _world, 
    address _components,
    address potentialPositionsRevealVerifierAddress
  ) System(_world, _components) {
    jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );
    poseidonSystem = PoseidonSystem(
      getSystemAddressById(components, PoseidonSystemID)
    );
    revealedPotentialPositionsComponent = RevealedPotentialPositionsComponent(
      getAddressById(components, RevealedPotentialPositionsComponentID)
    );
    potentialPositionsRevealVerifier = PotentialPositionsRevealVerifier(
      potentialPositionsRevealVerifierAddress
    );
    positionCommitmentComponent = PositionCommitmentComponent(
      getAddressById(components, PositionCommitmentComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, PotentialPositions memory potentialPositions, uint256[8] memory proofData) 
      = abi.decode(arguments, (uint256, PotentialPositions, uint256[8]));
    executeTyped(entity, potentialPositions, proofData);
  }

  function executeTyped(
    uint256 entity, 
    PotentialPositions memory potentialPositions, 
    uint256[8] memory proofData
  ) public returns (bytes memory) {
    ActionLib.verifyCanPerformAction(components, entity);

    potentialPositionsRevealVerifier.verifyProof(
      proofData, 
      [
        positionCommitmentComponent.getValue(entity),
        poseidonSystem.coordsPoseidonChainRoot(
          potentialPositions.xValues, potentialPositions.yValues
        )
      ]
    );

    jungleMoveCountComponent.set(entity, 1);
    revealedPotentialPositionsComponent.set(entity, potentialPositions);
  }
}
