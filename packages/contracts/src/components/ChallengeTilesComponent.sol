// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "solecs/Component.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.ChallengeTiles"));

  enum ChallengeType {
    ATTACK,
    SEARCH
  }

  struct ChallengeTileSet {
    uint16[] xValues;
    uint16[] yValues;
    uint256 commitment;
    ChallengeType challengeType;
    address challenger;
    uint256 creationTimestamp;
  }

contract ChallengeTilesComponent is Component {
  constructor(address world) Component(world, ID) {}

  function getSchema() public pure override returns (string[] memory keys, LibTypes.SchemaValue[] memory values) {
    keys = new string[](6);
    values = new LibTypes.SchemaValue[](6);

    keys[0] = "xValues";
    values[0] = LibTypes.SchemaValue.UINT16_ARRAY;

    keys[1] = "yValues";
    values[1] = LibTypes.SchemaValue.UINT16_ARRAY;

    keys[2] = "commitment";
    values[2] = LibTypes.SchemaValue.UINT256;

    keys[3] = "challengeType";
    values[3] = LibTypes.SchemaValue.UINT8;

    keys[4] = "challenger";
    values[4] = LibTypes.SchemaValue.ADDRESS;

    keys[5] = "creationTimestamp";
    values[5] = LibTypes.SchemaValue.UINT256;
  }

  function set(uint256 entity, ChallengeTileSet memory value) public {
    set(entity, abi.encode(
        value.xValues, value.yValues, value.commitment, value.challengeType, value.challenger,
        value.creationTimestamp
      ));
  }

  function getValue(uint256 entity) public view returns (ChallengeTileSet memory) {
    (uint16[] memory xValues, uint16[] memory yValues, uint256 commitment,
    ChallengeType challengeType, address challenger, uint256 creationTimestamp) =
    abi.decode(getRawValue(entity), (uint16[], uint16[], uint256, ChallengeType, address, uint256));
    return ChallengeTileSet(
      xValues, yValues, commitment, challengeType, challenger, creationTimestamp
    );
  }
}
