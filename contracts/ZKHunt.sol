// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import {JungleMoveVerifier} from "./JungleMoveVerifier.sol";
import {JungleEnterVerifier} from "./JungleEnterVerifier.sol";

function absDiff(uint8 a, uint8 b) pure returns (uint8) {
    return a > b ? a - b : b - a;
}

abstract contract Poseidon {
    function poseidon(uint256[3] memory inputs) public virtual returns (uint256);
}

contract ZKHunt {
    enum TileType {
        PLAINS,
        JUNGLE
    }

    struct Position {
        uint8 x;
        uint8 y;
    }

    Poseidon poseidonContract;
    JungleMoveVerifier jungleMoveVerifier;
    JungleEnterVerifier jungleEnterVerifier;

    // Only contains 225 useful bits (15 * 15 map)
    uint256 public mapData;
    uint16 constant mapSize = 15;

    mapping (address => bool) public playersActive;
    mapping (address => Position) public playerKnownPositions;
    mapping (address => uint256) public playerHiddenPositionCommitments;

    event PlayerActivated(address player);
    event PlayerPlainsMove(address indexed player, Position newPosition);
    event PlayerJungleEnter(address indexed player, Position newPosition);
    event PlayerJungleMove(address indexed player, uint256 commitment);
    event PlayerJungleExit(address indexed player, Position newPosition);

    constructor(
        address poseidonAddress, 
        address jungleMoveVerifierAddress,
        address jungleEnterVerifierAddress
    ) {
        poseidonContract = Poseidon(poseidonAddress);
        jungleMoveVerifier = JungleMoveVerifier(jungleMoveVerifierAddress);
        jungleEnterVerifier = JungleEnterVerifier(jungleEnterVerifierAddress);
    }

    modifier onlyPlayerOwner(address player) {
        require(playersActive[player], "Player not active");
        require(player == msg.sender, "Not the owner of this player");
        _;
    }

    function setMapData(uint256 newMapData) public {
        mapData = newMapData;
    }

    function activatePlayer(address player) public {
        if (!playersActive[player]) {
            playersActive[player] = true;
            emit PlayerActivated(player);
        }
    }

    function getMapTileValue(Position memory position) public view returns (TileType) {
        return TileType((mapData >> (position.x + position.y * mapSize)) & 1);
    }

    function checkValidMove(
        Position memory oldPosition, 
        Position memory newPosition, 
        TileType tileType
    ) private view {
        // Move is onto correct tile type
        require(
            getMapTileValue(newPosition) == tileType, 
            "Invalid move: move onto incorrect tile type"
        );

        // Move is only a single orthogonal step
        require(
            absDiff(newPosition.x, oldPosition.x) + absDiff(newPosition.y, oldPosition.y) == 1,
            "Invalid move: move isn't a single orthogonal step"
        );
    }

    function plainsMove(address player, Position calldata newPosition) public onlyPlayerOwner(player) {
        Position storage oldPosition = playerKnownPositions[player];
        checkValidMove(oldPosition, newPosition, TileType.PLAINS);

        playerKnownPositions[player] = newPosition;
        emit PlayerPlainsMove(player, newPosition);
    }

    function jungleEnter(
        address player,
        Position calldata newPosition,
        uint256 commitment,
        uint256[8] calldata proofData
    ) public onlyPlayerOwner(player) {
        Position storage oldPosition = playerKnownPositions[player];
        checkValidMove(oldPosition, newPosition, TileType.JUNGLE);
        
        require(
            jungleEnterVerifier.verifyProof(proofData, [commitment, newPosition.x, newPosition.y]),
            "Invalid proof"
        );

        playerKnownPositions[player] = newPosition;
        playerHiddenPositionCommitments[player] = commitment;
        emit PlayerJungleEnter(player, newPosition);
    }

    function jungleMove(
        address player,
        uint256 newCommitment,
        uint256[8] calldata proofData
    ) public onlyPlayerOwner(player) {
        require(
            jungleMoveVerifier.verifyProof(
                proofData, [playerHiddenPositionCommitments[player], newCommitment, mapData]
            ),
            "Invalid proof"
        );

        playerHiddenPositionCommitments[player] = newCommitment;
        emit PlayerJungleMove(player, newCommitment);
    }

    function jungleExit(
        address player, 
        Position calldata oldPosition,
        uint256 oldPositionNonce,
        Position calldata newPosition
    ) public onlyPlayerOwner(player) {
        checkValidMove(oldPosition, newPosition, TileType.PLAINS);
        require(
            poseidonContract.poseidon([oldPosition.x, oldPosition.y, oldPositionNonce]) == playerHiddenPositionCommitments[player],
            "Hash of old position and old nonce does not match the stored commitment"
        );

        playerKnownPositions[player] = newPosition;
        emit PlayerJungleExit(player, newPosition);
    }
}
