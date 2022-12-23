// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {HitTilesComponent, ID as HitTilesComponentID, HitTileSet} from "../components/HitTilesComponent.sol";
import {PositionComponent, ID as PositionComponentID, Position} from "../components/PositionComponent.sol";
import {PositionCommitmentComponent, ID as PositionCommitmentComponentID} from "../components/PositionCommitmentComponent.sol";
import {KillLib} from "../libraries/KillLib.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "./PoseidonSystem.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.JungleHitReceive"));

contract JungleHitReceiveSystem is System {
  HitTilesComponent hitTilesComponent;
  PositionComponent positionComponent;
  PositionCommitmentComponent positionCommitmentComponent;
  PoseidonSystem poseidonSystem;

  constructor(IWorld _world, address _components) System(_world, _components) {
    hitTilesComponent = HitTilesComponent(getAddressById(components, HitTilesComponentID));
    positionComponent = PositionComponent(getAddressById(components, PositionComponentID));
    positionCommitmentComponent = PositionCommitmentComponent(
      getAddressById(components, PositionCommitmentComponentID)
    );
    poseidonSystem = PoseidonSystem(getSystemAddressById(components, PoseidonSystemID));
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 hitTilesEntity, Position memory position, uint256 nonce) = 
      abi.decode(arguments, (uint256, uint256, Position, uint256));
    executeTyped(entity, hitTilesEntity, position, nonce);
  }

  function executeTyped(
    uint256 entity, 
    uint256 hitTilesEntity,
    Position memory position,
    uint256 nonce
  ) public returns (bytes memory) {
    require(
      poseidonSystem.poseidon3(position.x, position.y, nonce) == 
        positionCommitmentComponent.getValue(entity),
      "Hash of position and nonce does not match the stored commitment"
    );

    // Checks that the revealed position was actually contained within the hit tiles
    HitTileSet memory hitTileSet = hitTilesComponent.getValue(hitTilesEntity);
    bool wasHit = false;
    for (uint256 i = 0; i < 4; ++i) {
      if (position.x == hitTileSet.xValues[i] && position.y == hitTileSet.yValues[i]) {
        wasHit = true;
        break;
      }
    }
    require(wasHit, "Position supplied was not contained in relevant hit tiles");

    positionComponent.set(entity, position);
    KillLib.kill(components, entity);
  }
}
