// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {IUint256Component} from "solecs/interfaces/IUint256Component.sol";
import {TileType} from "../components/MapDataComponent.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {HitTilesComponent, ID as HitTilesComponentID, HitTileSet} from "../components/HitTilesComponent.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {PotentialHitUpdateSystem, ID as PotentialHitUpdateSystemID, UpdateType} from "../systems/PotentialHitUpdateSystem.sol";
import {JungleMoveCountComponent, ID as JungleMoveCountComponentID} from "../components/JungleMoveCountComponent.sol";
import {KillLib} from "../libraries/KillLib.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "../systems/PoseidonSystem.sol";
import {MapDataComponent, ID as MapDataComponentID, TileType} from "../components/MapDataComponent.sol";
import {MAP_SIZE} from "../Constants.sol";

    struct Stack {
        HitTilesComponent hitTilesComponent;
        PositionComponent positionComponent;
        JungleMoveCountComponent jungleMoveCountComponent;
        PoseidonSystem poseidonSystem;
        PotentialHitUpdateSystem potentialHitUpdateSystem;
        MapDataComponent mapDataComponent;
    }

library AttackLib {
    function attack(
        IUint256Component components, uint256 entity, uint256 hitTilesEntity, uint8 directionIndex,
        int8[2][4][32] storage spearHitTileOffsetList
    ) internal {
        Stack memory s;
        // Used to prevent stack too deep error
        s.hitTilesComponent = HitTilesComponent(getAddressById(components, HitTilesComponentID));
        s.positionComponent = PositionComponent(getAddressById(components, PositionComponentID));
        s.jungleMoveCountComponent = JungleMoveCountComponent(getAddressById(components, JungleMoveCountComponentID));
        s.poseidonSystem = PoseidonSystem(getSystemAddressById(components, PoseidonSystemID));
        s.potentialHitUpdateSystem = PotentialHitUpdateSystem(getSystemAddressById(components, PotentialHitUpdateSystemID));
        s.mapDataComponent = MapDataComponent(getAddressById(components, MapDataComponentID));

        require(
            directionIndex < spearHitTileOffsetList.length,
            "Provided directionIndex is too large"
        );

        Position memory entityPosition = s.positionComponent.getValue(entity);
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
        bool potentialHitExists = false;
        if (hitTouchesJungle) {
            // Potential hits added first so that the client knows whether all the hit tiles have resolved
            // instantly or not
            uint256[] memory entitiesInJungle = s.jungleMoveCountComponent.getEntities();
            for (uint256 i = 0; i < entitiesInJungle.length; ++i) {
                if (entitiesInJungle[i] != entity) {
                    s.potentialHitUpdateSystem.executeTyped(entitiesInJungle[i], hitTilesEntity, UpdateType.ADD);
                    potentialHitExists = true;
                }
            }
        }

        if (potentialHitExists) {
            s.hitTilesComponent.set(hitTilesEntity, HitTileSet({
            xValues : hitTilesXValues,
            yValues : hitTilesYValues,
            merkleChainRoot : s.poseidonSystem.coordsPoseidonChainRoot(hitTilesXValues, hitTilesYValues)
            }));
        } else {
            // Creates hit tiles and immediately removes them if there are no potential hits, so that the
            // tiles can show up on clients but then immediately expire after 1 second
            s.hitTilesComponent.set(hitTilesEntity, HitTileSet({
            xValues : hitTilesXValues,
            yValues : hitTilesYValues,
            merkleChainRoot : 0
            }));
            s.hitTilesComponent.remove(hitTilesEntity);
        }
    }
}
