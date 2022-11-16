// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {HitTilesComponent, ID as HitTilesComponentID, HitTileSet} from "../components/HitTilesComponent.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {PotentialHitUpdateSystem, ID as PotentialHitUpdateSystemID, UpdateType} from "../systems/PotentialHitUpdateSystem.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {KillSystem, ID as KillSystemID} from "./KillSystem.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "./PoseidonSystem.sol";
import {MapDataComponent, ID as MapDataComponentID, TileType} from "../components/MapDataComponent.sol";
import {HitTileOffsetListDefinitions} from "../HitTileOffsetListDefinitions.sol";
import {MAP_SIZE} from "../Constants.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.Attack"));

contract AttackSystem is System, HitTileOffsetListDefinitions {
  HitTilesComponent hitTilesComponent;
  PositionComponent positionComponent;
  JungleMoveCountComponent jungleMoveCountComponent;
  KillSystem killSystem;
  PoseidonSystem poseidonSystem;
  PotentialHitUpdateSystem potentialHitUpdateSystem;
  MapDataComponent internal mapDataComponent;

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
    potentialHitUpdateSystem = PotentialHitUpdateSystem(
      getSystemAddressById(components, PotentialHitUpdateSystemID)
    );
    mapDataComponent = MapDataComponent(getAddressById(components, MapDataComponentID));
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 hitTilesEntity, uint8 directionIndex) 
      = abi.decode(arguments, (uint256, uint256, uint8));
    executeTyped(entity, hitTilesEntity, directionIndex);
  }

  // TODO potentially make it so that the attacker specifies which hidden
  // entities they want to challenge with the attack? (breaks world 
  // integrity if they fail to specify an entity that they would have hit?)

  // The hitTilesEntity Id is created on the client
  function executeTyped(
    uint256 entity, uint256 hitTilesEntity, uint8 directionIndex
  ) public returns (bytes memory) {
    // TODO Put this logic into a higher system once more attacks are added
    // require(
    //   !jungleMoveCountComponent.has(entity), 
    //   "Cannot perform normal attack from within the jungle"
    // );

    require(
      directionIndex < spearHitTileOffsetList.length, 
      "Provided directionIndex is too large"
    );

    Position memory entityPosition = positionComponent.getValue(entity);
    int8[2][4] memory hitTileOffsets = spearHitTileOffsetList[uint8(directionIndex)];
    uint8[] memory hitTilesXValues = new uint8[](4);
    uint8[] memory hitTilesYValues = new uint8[](4);
    bool hitTouchesJungle = false; 

    for (uint256 i = 0; i < 4; ++i) {
      hitTilesXValues[i] = uint8(uint16(int16(uint16(entityPosition.x)) + hitTileOffsets[i][0]));
      hitTilesYValues[i] = uint8(uint16(int16(uint16(entityPosition.y)) + hitTileOffsets[i][1]));
      Position memory tilePosition = Position(hitTilesXValues[i], hitTilesYValues[i]);

      if (tilePosition.x < MAP_SIZE && tilePosition.y < MAP_SIZE) {
        // Kills entities present in hit tiles, which aren't in the jungle
        uint256[] memory potentiallyHitEntities = 
          positionComponent.getEntitiesWithValue(tilePosition);
        for (uint256 j = 0; j < potentiallyHitEntities.length; ++j) {
          // If not in the jungle, kill entity
          if (!jungleMoveCountComponent.has(potentiallyHitEntities[j])) {
            killSystem.executeTyped(potentiallyHitEntities[j]);
          }
        }

        if (mapDataComponent.getMapTileValue(tilePosition) == TileType.JUNGLE) {
          hitTouchesJungle = true;
        }
      }
    }

    // Shouldn't create any potential hits if none of the hit tiles touch the jungle
    bool potentialHitExists = false;
    if (hitTouchesJungle) {
      // Potential hits added first so that the client knows whether all the hit tiles have resolved 
      // instantly or not
      uint256[] memory entitiesInJungle = jungleMoveCountComponent.getEntities();
      for (uint256 i = 0; i < entitiesInJungle.length; ++i) {
        if (entitiesInJungle[i] != entity) {
          potentialHitUpdateSystem.executeTyped(entitiesInJungle[i], hitTilesEntity, UpdateType.ADD);
          potentialHitExists = true;
        }
      }
    }

    createHitTiles(hitTilesEntity, hitTilesXValues, hitTilesYValues, potentialHitExists);
  }

  // Logic split out into separate function to avoid stack too deep error
  function createHitTiles(
    uint256 hitTilesEntity, 
    uint8[] memory xValues, 
    uint8[] memory yValues, 
    bool potentialHitExists
  ) private {
    if (potentialHitExists) {
      hitTilesComponent.set(hitTilesEntity, HitTileSet({
        xValues: xValues,
        yValues: yValues,
        merkleRoot: poseidonSystem.poseidon2(
          poseidonSystem.poseidon2(
            poseidonSystem.poseidon2(xValues[0], yValues[0]), 
            poseidonSystem.poseidon2(xValues[1], yValues[1])
          ),
          poseidonSystem.poseidon2(
            poseidonSystem.poseidon2(xValues[2], yValues[2]), 
            poseidonSystem.poseidon2(xValues[3], yValues[3])
          )
        )
      }));
    } else {
      // Creates hit tiles and immediately removes them if there are no potential hits, so that the
      // tiles can show up on clients but then immediately expire after 1 second
      hitTilesComponent.set(hitTilesEntity, HitTileSet({
        xValues: xValues, 
        yValues: yValues, 
        merkleRoot: 0
      }));
      hitTilesComponent.remove(hitTilesEntity);
    }
  }
}
