pragma solidity >=0.8.0;

contract ChallengeTilesOffsetListDefinitions {
  int16[2][4][32] challengeTilesOffsetList = [
    [[int16(1), 0], [int16(2), 0], [int16(3), 0], [int16(4), 0]],
    [[int16(1), 0], [int16(2), 0], [int16(3), -1], [int16(4), -1]],
    [[int16(1), 0], [int16(2), -1], [int16(3), -1], [int16(4), -2]],
    [[int16(1), -1], [int16(2), -1], [int16(3), -2], [int16(4), -3]],
    [[int16(1), -1], [int16(2), -2], [int16(3), -3], [int16(4), -4]],
    [[int16(1), -1], [int16(1), -2], [int16(2), -3], [int16(3), -4]],
    [[int16(0), -1], [int16(1), -2], [int16(1), -3], [int16(2), -4]],
    [[int16(0), -1], [int16(0), -2], [int16(1), -3], [int16(1), -4]],
    [[int16(0), -1], [int16(0), -2], [int16(0), -3], [int16(0), -4]],
    [[int16(0), -1], [int16(0), -2], [int16(-1), -3], [int16(-1), -4]],
    [[int16(0), -1], [int16(-1), -2], [int16(-1), -3], [int16(-2), -4]],
    [[int16(-1), -1], [int16(-1), -2], [int16(-2), -3], [int16(-3), -4]],
    [[int16(-1), -1], [int16(-2), -2], [int16(-3), -3], [int16(-4), -4]],
    [[int16(-1), -1], [int16(-2), -1], [int16(-3), -2], [int16(-4), -3]],
    [[int16(-1), 0], [int16(-2), -1], [int16(-3), -1], [int16(-4), -2]],
    [[int16(-1), 0], [int16(-2), 0], [int16(-3), -1], [int16(-4), -1]],
    [[int16(-1), 0], [int16(-2), 0], [int16(-3), 0], [int16(-4), 0]],
    [[int16(-1), 0], [int16(-2), 0], [int16(-3), 1], [int16(-4), 1]],
    [[int16(-1), 0], [int16(-2), 1], [int16(-3), 1], [int16(-4), 2]],
    [[int16(-1), 1], [int16(-2), 1], [int16(-3), 2], [int16(-4), 3]],
    [[int16(-1), 1], [int16(-2), 2], [int16(-3), 3], [int16(-4), 4]],
    [[int16(-1), 1], [int16(-1), 2], [int16(-2), 3], [int16(-3), 4]],
    [[int16(0), 1], [int16(-1), 2], [int16(-1), 3], [int16(-2), 4]],
    [[int16(0), 1], [int16(0), 2], [int16(-1), 3], [int16(-1), 4]],
    [[int16(0), 1], [int16(0), 2], [int16(0), 3], [int16(0), 4]],
    [[int16(0), 1], [int16(0), 2], [int16(1), 3], [int16(1), 4]],
    [[int16(0), 1], [int16(1), 2], [int16(1), 3], [int16(2), 4]],
    [[int16(1), 1], [int16(1), 2], [int16(2), 3], [int16(3), 4]],
    [[int16(1), 1], [int16(2), 2], [int16(3), 3], [int16(4), 4]],
    [[int16(1), 1], [int16(2), 1], [int16(3), 2], [int16(4), 3]],
    [[int16(1), 0], [int16(2), 1], [int16(3), 1], [int16(4), 2]],
    [[int16(1), 0], [int16(2), 0], [int16(3), 1], [int16(4), 1]]
  ]; 
}