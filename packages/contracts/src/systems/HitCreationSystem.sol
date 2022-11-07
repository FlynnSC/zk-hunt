// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {HitTilesComponent, ID as HitTilesComponentID, HitTileSet} from "../components/HitTilesComponent.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {PotentialHitsComponent, ID as PotentialHitsComponentID} from "../components/PotentialHitsComponent.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {KillSystem, ID as KillSystemID} from "./KillSystem.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "./PoseidonSystem.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.HitCreation"));

enum Direction {
  Right,
  Up,
  Left,
  Down
}

contract HitCreationSystem is System {
  HitTilesComponent hitTilesComponent;
  PositionComponent positionComponent;
  JungleMoveCountComponent jungleMoveCountComponent;
  KillSystem killSystem;
  PoseidonSystem poseidonSystem;
  PotentialHitsComponent potentialHitsComponent;

  int8[2][4][4] hitTileOffsetList = [
    [[int8(1), 0], [int8(2), 0], [int8(3), 0], [int8(4), 0]],
    [[int8(0), -1], [int8(0), -2], [int8(0), -3], [int8(0), -4]],
    [[-1, 0], [-2, 0], [-3, 0], [-4, 0]],
    [[int8(0), 1], [int8(0), 2], [int8(0), 3], [int8(0), 4]]
  ]; 

  constructor(IWorld _world, address _components) System(_world, _components) {
    hitTilesComponent = HitTilesComponent(getAddressById(components, HitTilesComponentID));
    positionComponent = PositionComponent(getAddressById(components, PositionComponentID));
    jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );
    killSystem = KillSystem(getSystemAddressById(components, KillSystemID));
    poseidonSystem = PoseidonSystem(
      getSystemAddressById(components, PoseidonSystemID)
    );
    potentialHitsComponent = PotentialHitsComponent(getAddressById(components, PotentialHitsComponentID));
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 hitTilesEntity, Direction direction) 
      = abi.decode(arguments, (uint256, uint256, Direction));
    executeTyped(entity, hitTilesEntity, direction);
  }

  // TODO potentially make it so that the attacker specifies which hidden
  // entities they want to challenge with the attack? (breaks world 
  // integrity if they fail to specify an entity that they would have hit?)

  // TODO think about the consequences of a player creating hit tiles that are outside
  // of the map

  // The hitTilesEntity Id is created on the client
  function executeTyped(uint256 entity, uint256 hitTilesEntity, Direction direction) public returns (bytes memory) {
    Position memory entityPosition = positionComponent.getValue(entity);
    int8[2][4] memory hitTileOffsets = hitTileOffsetList[uint8(direction)];
    uint8[] memory hitTilesXValues = new uint8[](4);
    uint8[] memory hitTilesYValues = new uint8[](4);

    for (uint256 i = 0; i < 4; ++i) {
      hitTilesXValues[i] = uint8(uint16(int16(uint16(entityPosition.x)) + hitTileOffsets[i][0]));
      hitTilesYValues[i] = uint8(uint16(int16(uint16(entityPosition.y)) + hitTileOffsets[i][1]));

      // Kills entities present in hit tiles, which aren't in the jungle
      uint256[] memory potentiallyHitEntities = positionComponent.getEntitiesWithValue(
        Position(hitTilesXValues[i], hitTilesYValues[i])
      );
      for (uint256 j = 0; j < potentiallyHitEntities.length; ++j) {
        // If not in the jungle, kill entity
        if (!jungleMoveCountComponent.has(potentiallyHitEntities[j])) {
          killSystem.executeTyped(potentiallyHitEntities[j]);
        }
      }
    }

    // Potential hits added first so that the client knows whether all the hit tiles have resolved 
    // instantly or not
    uint256[] memory entitiesInJungle = jungleMoveCountComponent.getEntities();
    for (uint256 i = 0; i < entitiesInJungle.length; ++i) {
      potentialHitsComponent.addPotentialHit(entitiesInJungle[i], hitTilesEntity);
    }

    hitTilesComponent.set(hitTilesEntity, HitTileSet({
      xValues: hitTilesXValues,
      yValues: hitTilesYValues,
      merkleRoot: poseidonSystem.poseidon2(
        poseidonSystem.poseidon2(
          poseidonSystem.poseidon2(hitTilesXValues[0], hitTilesYValues[0]), poseidonSystem.poseidon2(hitTilesXValues[1], hitTilesYValues[1])
        ),
        poseidonSystem.poseidon2(
          poseidonSystem.poseidon2(hitTilesXValues[2], hitTilesYValues[2]), poseidonSystem.poseidon2(hitTilesXValues[3], hitTilesYValues[3])
        )
      )
    }));
  }
}
