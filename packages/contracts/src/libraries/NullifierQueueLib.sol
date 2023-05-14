// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import {getAddressById, getSystemAddressById} from "solecs/utils.sol";
import {IUint256Component} from "solecs/interfaces/IUint256Component.sol";
import {GodID} from "../Constants.sol";
import {NullifierQueueComponent, ID as NullifierQueueComponentID, NullifierQueue} from "../components/NullifierQueueComponent.sol";
import {PoseidonSystem, ID as PoseidonSystemID} from "../systems/PoseidonSystem.sol";

library NullifierQueueLib {
  function pushNullifier(IUint256Component components, uint256 entity, uint256 nullifier) internal {
    NullifierQueueComponent nullifierQueueComponent = NullifierQueueComponent(
      getAddressById(components, NullifierQueueComponentID)
    );

    // Increments the headIndex and places the new nullifier at that index
    NullifierQueue memory nullifierQueue = nullifierQueueComponent.getValue(entity);
    nullifierQueue.headIndex = (nullifierQueue.headIndex + 1) % nullifierQueueComponent.length();
    nullifierQueue.queue[nullifierQueue.headIndex] = nullifier;

    nullifierQueueComponent.set(entity, nullifierQueue);
  }

  function getRoot(IUint256Component components, uint256 entity) internal returns (uint256) {
    PoseidonSystem poseidonSystem = PoseidonSystem(
      getSystemAddressById(components, PoseidonSystemID)
    );
    NullifierQueueComponent nullifierQueueComponent = NullifierQueueComponent(
      getAddressById(components, NullifierQueueComponentID)
    );

    NullifierQueue memory nullifierQueue = nullifierQueueComponent.getValue(entity);

    uint256 length = nullifierQueueComponent.length();
    uint256 root = poseidonSystem.poseidon2(
      nullifierQueue.queue[nullifierQueue.headIndex],
      nullifierQueue.queue[(nullifierQueue.headIndex + 1) % length]
    );
    for (uint256 i = 2; i < length; ++i) {
      root = poseidonSystem.poseidon2(
        root, nullifierQueue.queue[(nullifierQueue.headIndex + i) % length]
      );
    }
    
    return root;
  }
}
