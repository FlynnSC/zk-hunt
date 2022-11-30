// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {ChallengeTilesComponent, ID as ChallengeTilesComponentID, ChallengeTileSet} from "../components/ChallengeTilesComponent.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {PendingChallengeUpdateSystem, ID as PendingChallengeUpdateSystemID, UpdateType} from "../systems/PendingChallengeUpdateSystem.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "./PoseidonSystem.sol";
import {MapDataComponent, ID as MapDataComponentID, TileType} from "../components/MapDataComponent.sol";
import {HitTileOffsetListDefinitions} from "../HitTileOffsetListDefinitions.sol";
import {MAP_SIZE} from "../Constants.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.Search"));

contract SearchSystem is System, HitTileOffsetListDefinitions {
  ChallengeTilesComponent challengeTilesComponent;
  PositionComponent positionComponent;
  JungleMoveCountComponent jungleMoveCountComponent;
  PoseidonSystem poseidonSystem;
  PendingChallengeUpdateSystem pendingChallengeUpdateSystem;
  MapDataComponent mapDataComponent;

  constructor(IWorld _world, address _components) System(_world, _components) {
    challengeTilesComponent = ChallengeTilesComponent(getAddressById(components, ChallengeTilesComponentID));
    positionComponent = PositionComponent(getAddressById(components, PositionComponentID));
    jungleMoveCountComponent = JungleMoveCountComponent(
      getAddressById(components, JungleMoveCountComponentID)
    );
    poseidonSystem = PoseidonSystem(
      getSystemAddressById(components, PoseidonSystemID)
    );
    pendingChallengeUpdateSystem = PendingChallengeUpdateSystem(
      getSystemAddressById(components, PendingChallengeUpdateSystemID)
    );
    mapDataComponent = MapDataComponent(getAddressById(components, MapDataComponentID));
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 challengeTilesEntity, uint8 directionIndex) 
      = abi.decode(arguments, (uint256, uint256, uint8));
    executeTyped(entity, challengeTilesEntity, directionIndex);
  }

  // TODO potentially make it so that the searcher specifies which hidden
  // entities they want to challenge with the search? (breaks world 
  // integrity if they fail to specify an entity that they would have found?)

  // The challengeTilesEntity Id is created on the client
  function executeTyped(
    uint256 entity, uint256 challengeTilesEntity, uint8 directionIndex
  ) public returns (bytes memory) {
    require(
      directionIndex < spearHitTileOffsetList.length, 
      "Provided directionIndex is too large"
    );

    require(
      !challengeTilesComponent.has(challengeTilesEntity), 
      "Supplied challenge tiles entity already exists"
    );

    Position memory entityPosition = positionComponent.getValue(entity);
    int8[2][4] memory challengeTilesOffsets = spearHitTileOffsetList[uint8(directionIndex)];
    uint8[] memory challengeTilesXValues = new uint8[](4);
    uint8[] memory challengeTilesYValues = new uint8[](4);
    bool challengeTouchesJungle = false; 

    // TODO make position use uint16 instead of uint8 to get rid of this mess below
    for (uint256 i = 0; i < 4; ++i) {
      challengeTilesXValues[i] = uint8(
        uint16(int16(uint16(entityPosition.x)) + challengeTilesOffsets[i][0])
      );
      challengeTilesYValues[i] = uint8(
        uint16(int16(uint16(entityPosition.y)) + challengeTilesOffsets[i][1])
      );
      Position memory tilePosition = Position(challengeTilesXValues[i], challengeTilesYValues[i]);

      if (
        tilePosition.x < MAP_SIZE && tilePosition.y < MAP_SIZE && 
        mapDataComponent.getMapTileValue(tilePosition) == TileType.JUNGLE
      ) {
        challengeTouchesJungle = true;
      }
    }

    // Shouldn't create any pending challenges if none of the challenge tiles touch the jungle
    bool pendingChallengeExists = false;
    if (challengeTouchesJungle) {
      // Pending challenges added first so that the client knows whether all the challenge tiles
      // have resolved instantly or not
      uint256[] memory entitiesInJungle = jungleMoveCountComponent.getEntities();
      for (uint256 i = 0; i < entitiesInJungle.length; ++i) {
        if (entitiesInJungle[i] != entity) {
          pendingChallengeUpdateSystem.executeTyped(entitiesInJungle[i], challengeTilesEntity, UpdateType.ADD);
          pendingChallengeExists = true;
        }
      }
    }

    if (pendingChallengeExists) {
      challengeTilesComponent.set(challengeTilesEntity, ChallengeTileSet({
        xValues: challengeTilesXValues,
        yValues: challengeTilesYValues,
        merkleChainRoot: poseidonSystem.coordsPoseidonChainRoot(
          challengeTilesXValues, challengeTilesYValues
        ),
        challenger: msg.sender
      }));
    } else {
      // Creates hit tiles and immediately removes them if there are no pending challenges, so that 
      // the tiles can show up on clients but then expire after 1 second
      challengeTilesComponent.set(challengeTilesEntity, ChallengeTileSet({
        xValues: challengeTilesXValues,
        yValues: challengeTilesYValues,
        merkleChainRoot: 0,
        challenger: msg.sender
      }));

      challengeTilesComponent.remove(challengeTilesEntity);
    }
  }
}
