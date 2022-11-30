// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/Component.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.HiddenChallenge"));

struct HiddenChallenge {
  uint256[] cipherText;
  uint256 encryptionNonce;
  address challenger;
  uint256 creationTimestamp;
}

// TODO make SingletonComponent
contract HiddenChallengeComponent is Component {
  constructor(address world) Component(world, ID) {}

  function getSchema() public pure override returns (string[] memory keys, LibTypes.SchemaValue[] memory values) {
    keys = new string[](4);
    values = new LibTypes.SchemaValue[](4);

    keys[0] = "cipherText";
    values[0] = LibTypes.SchemaValue.UINT256_ARRAY;

    keys[1] = "encryptionNonce";
    values[1] = LibTypes.SchemaValue.UINT256;

    keys[2] = "challenger";
    values[2] = LibTypes.SchemaValue.ADDRESS;

    keys[3] = "creationTimestamp";
    values[3] = LibTypes.SchemaValue.UINT256;
  }

  // TODO bruh figure out why encoding and decoding the struct directly doesn't work on the client
  function set(uint256 entity, HiddenChallenge memory value) public {
    // set(entity, abi.encode(value));
    set(
      entity, 
      abi.encode(value.cipherText, value.encryptionNonce, value.challenger, value.creationTimestamp)
    );
  }

  function getValue(uint256 entity) public view returns (HiddenChallenge memory) {
    // return abi.decode(getRawValue(entity), (HiddenChallenge));
    (uint256[] memory cipherText, uint256 encryptionNonce, address challenger, 
      uint256 creationTimestamp) = abi.decode(getRawValue(entity), (uint256[], uint256, address, uint256));
    return HiddenChallenge(cipherText, encryptionNonce, challenger, creationTimestamp);
  }
}
