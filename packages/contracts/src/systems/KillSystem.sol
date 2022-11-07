// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById} from "solecs/utils.sol";
import {DeadComponent, ID as DeadComponentID} from "../components/DeadComponent.sol";
import {PotentialHitsComponent, ID as PotentialHitsComponentID} from "../components/PotentialHitsComponent.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.Kill"));

contract KillSystem is System {
  DeadComponent deadComponent;
  PotentialHitsComponent potentialHitsComponent;
  JungleMoveCountComponent jungleMoveCountComponent;

  constructor(IWorld _world, address _components) System(_world, _components) {
    deadComponent = DeadComponent(getAddressById(components, DeadComponentID));
    potentialHitsComponent = PotentialHitsComponent(
      getAddressById(components, PotentialHitsComponentID)
    );
    jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity) = abi.decode(arguments, (uint256));
    executeTyped(entity);
  }

  function executeTyped(uint256 entity) public returns (bytes memory) {
    deadComponent.set(entity);
    potentialHitsComponent.remove(entity);
    jungleMoveCountComponent.remove(entity);
  }
}
