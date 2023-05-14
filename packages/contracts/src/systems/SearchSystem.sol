// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {ChallengeTilesComponent, ID as ChallengeTilesComponentID, ChallengeTileSet, ChallengeType} from "../components/ChallengeTilesComponent.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {PendingChallengeUpdateLib} from "../libraries/PendingChallengeUpdateLib.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "./PoseidonSystem.sol";
import {MapDataComponent, ID as MapDataComponentID, TileType} from "../components/MapDataComponent.sol";
import {ChallengeTilesOffsetListDefinitions} from "../ChallengeTilesOffsetListDefinitions.sol";
import {MAP_SIZE} from "../Constants.sol";
import {ActionLib} from "../libraries/ActionLib.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.Search"));

contract SearchSystem is System, ChallengeTilesOffsetListDefinitions {
  ChallengeTilesComponent challengeTilesComponent;
  PositionComponent positionComponent;
  JungleMoveCountComponent jungleMoveCountComponent;
  PoseidonSystem poseidonSystem;
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
    mapDataComponent = MapDataComponent(getAddressById(components, MapDataComponentID));
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 challengeTilesEntity, uint8 directionIndex)
    = abi.decode(arguments, (uint256, uint256, uint8));
    executeTyped(entity, challengeTilesEntity, directionIndex);
  }

  // The challengeTilesEntity Id is created on the client
  function executeTyped(
    uint256 entity, uint256 challengeTilesEntity, uint8 directionIndex
  ) public returns (bytes memory) {
    ActionLib.verifyCanPerformAction(components, entity);

    require(
      directionIndex < challengeTilesOffsetList.length,
      "Provided directionIndex is too large"
    );

    require(
      !challengeTilesComponent.has(challengeTilesEntity),
      "Supplied challenge tiles entity already exists"
    );

    Position memory entityPosition = positionComponent.getValue(entity);
    int16[2][4] memory challengeTilesOffsets = challengeTilesOffsetList[uint8(directionIndex)];
    uint16[] memory challengeTilesXValues = new uint16[](4);
    uint16[] memory challengeTilesYValues = new uint16[](4);
    bool challengeTouchesJungle = false;

    for (uint256 i = 0; i < 4; ++i) {
      challengeTilesXValues[i] = uint16(int16(entityPosition.x) + challengeTilesOffsets[i][0]);
      challengeTilesYValues[i] = uint16(int16(entityPosition.y) + challengeTilesOffsets[i][1]);
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
          PendingChallengeUpdateLib.add(components, entitiesInJungle[i], challengeTilesEntity);
          pendingChallengeExists = true;
        }
      }
    }

    ChallengeTileSet memory challengeTileSet = ChallengeTileSet({
      xValues: challengeTilesXValues,
      yValues: challengeTilesYValues,
      commitment: 0,
      challengeType: ChallengeType.SEARCH,
      challenger: msg.sender,
      creationTimestamp: block.timestamp
    });

    if (pendingChallengeExists) {
      challengeTileSet.commitment = poseidonSystem.coordsPoseidonChainRoot(
        challengeTilesXValues, challengeTilesYValues
      );
      challengeTilesComponent.set(challengeTilesEntity, challengeTileSet);
    } else {
      // Creates challenge tiles and immediately removes them if there are no pending challenges, so
      // that the tiles can show up on clients but then expire after 1 second
      challengeTilesComponent.set(challengeTilesEntity, challengeTileSet);
      challengeTilesComponent.remove(challengeTilesEntity);
    }
  }
}
