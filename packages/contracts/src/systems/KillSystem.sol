// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {DeadComponent, ID as DeadComponentID} from "../components/DeadComponent.sol";
import {PotentialHitUpdateSystem, ID as PotentialHitUpdateSystemID, UpdateType} from "../systems/PotentialHitUpdateSystem.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {RevealedPotentialPositionsComponent, ID as RevealedPotentialPositionsComponentID} from "../components/RevealedPotentialPositionsComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.Kill"));

contract KillSystem is System {
  DeadComponent deadComponent;
  PotentialHitUpdateSystem potentialHitUpdateSystem;
  JungleMoveCountComponent jungleMoveCountComponent;
  RevealedPotentialPositionsComponent revealedPotentialPositionsComponent;

  constructor(IWorld _world, address _components) System(_world, _components) {
    deadComponent = DeadComponent(getAddressById(components, DeadComponentID));
    potentialHitUpdateSystem = PotentialHitUpdateSystem(
      getSystemAddressById(components, PotentialHitUpdateSystemID)
    );
    jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );
    revealedPotentialPositionsComponent = RevealedPotentialPositionsComponent(
      getAddressById(components, RevealedPotentialPositionsComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity) = abi.decode(arguments, (uint256));
    executeTyped(entity);
  }

  function executeTyped(uint256 entity) public returns (bytes memory) {
    deadComponent.set(entity);
    potentialHitUpdateSystem.executeTyped(entity, 0, UpdateType.CLEAR);
    jungleMoveCountComponent.remove(entity);
    revealedPotentialPositionsComponent.remove(entity);
    // TODO add in pending challenges removal here, and properly test results of doing so?
  }
}
