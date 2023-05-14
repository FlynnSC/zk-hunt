// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {IUint256Component} from "solecs/interfaces/IUint256Component.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {ChallengeTilesComponent, ID as ChallengeTilesComponentID, ChallengeTileSet, ChallengeType} from "../components/ChallengeTilesComponent.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {PendingChallengeUpdateLib} from "../libraries/PendingChallengeUpdateLib.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {KillLib} from "../libraries/KillLib.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "../systems/PoseidonSystem.sol";
import {MapDataComponent, ID as MapDataComponentID, TileType} from "../components/MapDataComponent.sol";
import {MAP_SIZE} from "../Constants.sol";
import {ActionLib} from "../libraries/ActionLib.sol";

struct Stack {
  ChallengeTilesComponent challengeTilesComponent;
  PositionComponent positionComponent;
  JungleMoveCountComponent jungleMoveCountComponent;
  PoseidonSystem poseidonSystem;
  MapDataComponent mapDataComponent;
}

library AttackLib {
  function attack(
    IUint256Component components, uint256 entity, uint256 challengeTilesEntity, uint8 directionIndex,
    int16[2][4][32] storage challengeTilesOffsetList
  ) internal {
    Stack memory s;
    // Used to prevent stack too deep error
    s.challengeTilesComponent = ChallengeTilesComponent(getAddressById(components, ChallengeTilesComponentID));
    s.positionComponent = PositionComponent(getAddressById(components, PositionComponentID));
    s.jungleMoveCountComponent = JungleMoveCountComponent(getAddressById(components, JungleMoveCountComponentID));
    s.poseidonSystem = PoseidonSystem(getSystemAddressById(components, PoseidonSystemID));
    s.mapDataComponent = MapDataComponent(getAddressById(components, MapDataComponentID));

    ActionLib.verifyCanPerformAction(components, entity);

    require(
      directionIndex < challengeTilesOffsetList.length,
      "Provided directionIndex is too large"
    );

    Position memory entityPosition = s.positionComponent.getValue(entity);
    int16[2][4] memory challengeTilesOffsets = challengeTilesOffsetList[uint8(directionIndex)];
    uint16[] memory challengeTilesXValues = new uint16[](4);
    uint16[] memory challengeTilesYValues = new uint16[](4);
    bool hitTouchesJungle = false;

    for (uint256 i = 0; i < 4; ++i) {
      challengeTilesXValues[i] = uint16(int16(entityPosition.x) + challengeTilesOffsets[i][0]);
      challengeTilesYValues[i] = uint16(int16(entityPosition.y) + challengeTilesOffsets[i][1]);
      Position memory tilePosition = Position(challengeTilesXValues[i], challengeTilesYValues[i]);

      if (tilePosition.x < MAP_SIZE && tilePosition.y < MAP_SIZE) {
        // Kills entities present in hit tiles, which aren't in the jungle
        uint256[] memory potentiallyHitEntities =
        s.positionComponent.getEntitiesWithValue(tilePosition);
        for (uint256 j = 0; j < potentiallyHitEntities.length; ++j) {
          // If not in the jungle, kill entity
          if (!s.jungleMoveCountComponent.has(potentiallyHitEntities[j])) {
            KillLib.kill(components, potentiallyHitEntities[j]);
          }
        }

        if (s.mapDataComponent.getMapTileValue(tilePosition) == TileType.JUNGLE) {
          hitTouchesJungle = true;
        }
      }
    }

    // Shouldn't create any potential hits if none of the hit tiles touch the jungle
    bool pendingChallengeExists = false;
    if (hitTouchesJungle) {
      // Potential hits added first so that the client knows whether all the hit tiles have resolved
      // instantly or not
      uint256[] memory entitiesInJungle = s.jungleMoveCountComponent.getEntities();
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
      challengeType: ChallengeType.ATTACK,
      challenger: msg.sender,
      creationTimestamp: block.timestamp
    });

    if (pendingChallengeExists) {
      challengeTileSet.commitment = s.poseidonSystem.coordsPoseidonChainRoot(
        challengeTilesXValues, challengeTilesYValues
      );
      s.challengeTilesComponent.set(challengeTilesEntity, challengeTileSet);
    } else {
      // Creates challenge tiles and immediately removes them if there are no potential hits, so
      // that the tiles can show up on clients but then expire after 1 second
      s.challengeTilesComponent.set(challengeTilesEntity, challengeTileSet);
      s.challengeTilesComponent.remove(challengeTilesEntity);
    }
  }
}
