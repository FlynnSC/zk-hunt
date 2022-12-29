// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/System.sol";
import {IWorld} from "solecs/interfaces/IWorld.sol";
import {getAddressById, getSystemAddressById, addressToEntity} from "solecs/utils.sol";
import {ChallengeTilesComponent, ID as ChallengeTilesComponentID, ChallengeTileSet} from "../components/ChallengeTilesComponent.sol";
import {LiquidationLib} from "../libraries/LiquidationLib.sol";
import {PendingChallengesComponent, ID as PendingChallengesComponentID} from "../components/PendingChallengesComponent.sol";
import {RESPONSE_PERIOD} from "../Constants.sol";

uint256 constant ID = uint256(keccak256("zkhunt.system.Liquidation"));

contract LiquidationSystem is System {
  ChallengeTilesComponent challengeTilesComponent;
  PendingChallengesComponent pendingChallengesComponent;  

  constructor(IWorld _world, address _components) System(_world, _components) {
    challengeTilesComponent = ChallengeTilesComponent(
      getAddressById(components, ChallengeTilesComponentID)
    );
    pendingChallengesComponent = PendingChallengesComponent(
      getAddressById(components, PendingChallengesComponentID)
    );
  }

  function execute(bytes memory arguments) public returns (bytes memory) {
    (uint256 entity, uint256 challengeTilesEntity) = abi.decode(arguments, (uint256, uint256));
    executeTyped(entity, challengeTilesEntity);
  }

  function executeTyped(uint256 entity, uint256 challengeTilesEntity) public returns (bytes memory) {
    ChallengeTileSet memory challengeTiles = challengeTilesComponent.getValue(challengeTilesEntity);
    uint256[] memory pendingChallenges  = pendingChallengesComponent.getValue(entity);

    bool wasFound = false;
    for (uint256 i = 0; i < pendingChallenges.length; ++i) {
      if (pendingChallenges[i] == challengeTilesEntity) {
        wasFound = true;
        break;
      }
    }

    require(
      wasFound, 
      "This entity does not have a pending challenge active for the supplied challenge tiles entity"
    );

    require(
      block.timestamp > challengeTiles.creationTimestamp + RESPONSE_PERIOD,
      "Response period has not elapsed"
    );

    LiquidationLib.liquidate(components, entity);
  }
}
