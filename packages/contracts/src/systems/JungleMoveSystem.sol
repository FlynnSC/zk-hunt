// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {MoveSystem} from "./MoveSystem.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {JungleMoveVerifier} from "../dependencies/JungleMoveVerifier.sol";
import {getAddressById} from "solecs/utils.sol";
import {GodID} from "../Constants.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {ActionLib} from "../libraries/ActionLib.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.JungleMove"));

contract JungleMoveSystem is MoveSystem {
  JungleMoveVerifier jungleMoveVerifier;
  JungleMoveCountComponent jungleMoveCountComponent;

  constructor(
    IWorld _world,
    address _components,
    address jungleMoveVerifierAddress
  ) MoveSystem(_world, _components) {
    jungleMoveVerifier = JungleMoveVerifier(jungleMoveVerifierAddress);
    jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 newCommitment, uint256[8] memory proofData) =
      abi.decode(arguments, (uint256, uint256, uint256[8]));
    executeTyped(entity, newCommitment, proofData);
  }

  function executeTyped(
    uint256 entity,
    uint256 newCommitment,
    uint256[8] memory proofData
  ) public returns (bytes memory) {
    ActionLib.verifyCanPerformAction(components, entity);
    require(jungleMoveCountComponent.has(entity), "Player is not inside the jungle");

    jungleMoveVerifier.verifyProof(
      proofData,
      [
        newCommitment,
        positionCommitmentComponent.getValue(entity),
        mapDataComponent.getValue(GodID).root
      ]
    );

    positionCommitmentComponent.set(entity, newCommitment);
    jungleMoveCountComponent.set(entity, jungleMoveCountComponent.getValue(entity) + 1);
  }
}
