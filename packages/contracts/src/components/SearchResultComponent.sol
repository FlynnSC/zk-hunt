// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;
import "solecs/Component.sol";

uint256 constant ID = uint256(keccak256("zkhunt.component.SearchResult"));

struct SearchResult {
  uint256[] cipherText; // The position commitment nonce
  uint256 encryptionNonce; // The nonce used for encryption/decryption
}

contract SearchResultComponent is Component {
  constructor(address world) Component(world, ID) {}

  function getSchema() public pure override returns (string[] memory keys, LibTypes.SchemaValue[] memory values) {
    keys = new string[](2);
    values = new LibTypes.SchemaValue[](2);

    keys[0] = "cipherText";
    values[0] = LibTypes.SchemaValue.UINT256_ARRAY;

    keys[1] = "encryptionNonce";
    values[1] = LibTypes.SchemaValue.UINT256;
  }

  // TODO figure out why encoding and decoding the struct directly doesn't work on the client
  function set(uint256 entity, SearchResult memory value) public {
    // set(entity, abi.encode(value));
    set(entity, abi.encode(value.cipherText, value.encryptionNonce));
  }

  function getValue(uint256 entity) public view returns (SearchResult memory) {
    // return abi.decode(getRawValue(entity), (SearchResult));
    (uint256[] memory cipherText, uint256 encryptionNonce) = 
      abi.decode(getRawValue(entity), (uint256[], uint256));
    return SearchResult(cipherText, encryptionNonce);
  }
}
