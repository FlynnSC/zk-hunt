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
    uint256 potentialPositionsMerkleRoot = poseidonSystem.poseidon2(
      poseidonSystem.poseidon2(
        poseidonSystem.poseidon2(potentialPositions.xValues[0], potentialPositions.yValues[0]), 
        poseidonSystem.poseidon2(potentialPositions.xValues[1], potentialPositions.yValues[1])
      ),
      poseidonSystem.poseidon2(
        poseidonSystem.poseidon2(potentialPositions.xValues[2], potentialPositions.yValues[2]), 
        poseidonSystem.poseidon2(potentialPositions.xValues[3], potentialPositions.yValues[3])
      )
    );

    require(
      potentialPositionsRevealVerifier.verifyProof(
        proofData, 
        [
          potentialPositionsMerkleRoot,
          positionCommitmentComponent.getValue(entity)
        ]
      ),
      "Invalid proof"
    );

    jungleMoveCountComponent.set(entity, 1);
    revealedPotentialPositionsComponent.set(entity, potentialPositions);
  }
}
