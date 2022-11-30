// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/Component.sol";
import {GodID} from "../Constants.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.NullifierQueue"));

struct NullifierQueue {
  uint256[] queue;
  uint8 headIndex;
}

// TODO make SingletonComponent
contract NullifierQueueComponent is Component {
  uint8 public constant length = 10;

  constructor(address world) Component(world, ID) {
    set(GodID, NullifierQueue(new uint256[](10), 0)); 
  }

  function getSchema() public pure override returns (string[] memory keys, LibTypes.SchemaValue[] memory values) {
    keys = new string[](2);
    values = new LibTypes.SchemaValue[](2);

    keys[0] = "queue";
    values[0] = LibTypes.SchemaValue.UINT256_ARRAY;

    keys[1] = "headIndex";
    values[1] = LibTypes.SchemaValue.UINT8;
  }

  // TODO bruh figure out why encoding and decoding the struct directly doesn't work on the client
  function set(uint256 entity, NullifierQueue memory value) public {
    // set(entity, abi.encode(value));
    set(entity, abi.encode(value.queue, value.headIndex));
  }

  function getValue(uint256 entity) public view returns (NullifierQueue memory) {
    // return abi.decode(getRawValue(entity), (NullifierQueue));
    (uint256[] memory queue, uint8 headIndex) = 
      abi.decode(getRawValue(entity), (uint256[], uint8));
    return NullifierQueue(queue, headIndex);
  }
}
