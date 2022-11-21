// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import {DSTest} from "ds-test/test.sol";
import {Utilities} from "./utils/Utilities.sol";
import {Deploy} from "./utils/Deploy.sol";
import {Cheats} from "./utils/Cheats.sol";
import {MudTest} from "./MudTest.t.sol";
import {SpawnSystem, ID as SpawnSystemID} from "../systems/SpawnSystem.sol";
import {PlainsMoveSystem, ID as PlainsMoveSystemID} from "../systems/PlainsMoveSystem.sol";
import {JungleEnterSystem, ID as JungleEnterSystemID} from "../systems/JungleEnterSystem.sol";
import {JungleMoveSystem, ID as JungleMoveSystemID} from "../systems/JungleMoveSystem.sol";
import {PositionComponent, ID as PositionComponentID} from "../components/PositionComponent.sol";
import {Position} from "../components/MapDataComponent.sol";
import {addressToEntity} from "solecs/utils.sol";

contract TempTest is MudTest {
  function testMove() public {
    SpawnSystem spawnSystem = SpawnSystem(world.getSystemAddress(SpawnSystemID));
    PlainsMoveSystem plainsMoveSystem = PlainsMoveSystem(world.getSystemAddress(PlainsMoveSystemID));
    JungleEnterSystem jungleEnterSystem = JungleEnterSystem(world.getSystemAddress(JungleEnterSystemID));
    JungleMoveSystem jungleMoveSystem = JungleMoveSystem(world.getSystemAddress(JungleMoveSystemID));
    PositionComponent positionComponent = PositionComponent(world.getComponent(PositionComponentID));

    // spawnSystem.executeTyped(alice);
    // Position memory position = positionComponent.getValue(addressToEntity(alice));
    // assertTrue(position.x != 0 || position.y != 0);
    // plainsMoveSystem.executeTyped(addressToEntity(alice), Position({x: 1, y: 0}));
    // jungleEnterSystemSystem.executeTyped(addressToEntity(alice), Position({x: 2, y: 0}));
  }
}
