pragma circom 2.1.2;

include "smallRangeCheck.circom";
include "selectIndex.circom";

// Outputs challenge tiles based on the supplied ofsets and position, and verifies that the
// challenge tiles offsets are valid
template CalcChallengeTiles() {
    var tileCount = 4;

    signal input x, y;
    signal input direction;

    signal output challengeTilesXValues[tileCount], challengeTilesYValues[tileCount];

    var directionCount = 32;
    var xOffsetsOptions[tileCount][directionCount] = [
        [1,1,1,1,1,1,0,0,0,0,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,1,1,1,1,1],
        [2,2,2,2,2,1,1,0,0,0,-1,-1,-2,-2,-2,-2,-2,-2,-2,-2,-2,-1,-1,0,0,0,1,1,2,2,2,2],
        [3,3,3,3,3,2,1,1,0,-1,-1,-2,-3,-3,-3,-3,-3,-3,-3,-3,-3,-2,-1,-1,0,1,1,2,3,3,3,3],
        [4,4,4,4,4,3,2,1,0,-1,-2,-3,-4,-4,-4,-4,-4,-4,-4,-4,-4,-3,-2,-1,0,1,2,3,4,4,4,4]
    ];
    var yOffsetsOptions[tileCount][directionCount] = [
        [0,0,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
        [0,0,-1,-1,-2,-2,-2,-2,-2,-2,-2,-2,-2,-1,-1,0,0,0,1,1,2,2,2,2,2,2,2,2,2,1,1,0],
        [0,-1,-1,-2,-3,-3,-3,-3,-3,-3,-3,-3,-3,-2,-1,-1,0,1,1,2,3,3,3,3,3,3,3,3,3,2,1,1],
        [0,-1,-2,-3,-4,-4,-4,-4,-4,-4,-4,-4,-4,-3,-2,-1,0,1,2,3,4,4,4,4,4,4,4,4,4,3,2,1]
    ];

    // Checks that the direction is valid
    SmallRangeCheck(directionCount)(direction);

    // Calculates the offsets by summing across all possible options, and then outputs the
    // challenge tiles
    for (var i = 0; i < tileCount; i++) {
        var xOffset = SelectIndex(directionCount)(xOffsetsOptions[i], direction);
        var yOffset = SelectIndex(directionCount)(yOffsetsOptions[i], direction);
        challengeTilesXValues[i] <== x + xOffset;
        challengeTilesYValues[i] <== y + yOffset;
    }
}
