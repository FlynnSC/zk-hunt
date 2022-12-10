import {isEqual} from 'lodash';

// Rotates a tuple [x, y] 90 degrees
function rotateTuple(tuple: [number, number]) {
  return [tuple[1], -tuple[0]] as [number, number];
}

// Generates a full turn of hit tiles from a quarter turn
function generateHitTilesFromQuarter(hitTilesSet: [number, number][][]) {
  const newHitTilesSet = [hitTilesSet];
  for (let i = 0; i < 3; ++i) {
    newHitTilesSet.push(newHitTilesSet[i].map(hitTiles => hitTiles.map(rotateTuple)));
  }
  return newHitTilesSet.flat();
}

export const spearHitTileOffsetList = generateHitTilesFromQuarter([
  [[1, 0], [2, 0], [3, 0], [4, 0]],
  [[1, 0], [2, 0], [3, -1], [4, -1]],
  [[1, 0], [2, -1], [3, -1], [4, -2]],
  [[1, -1], [2, -1], [3, -2], [4, -3]],
  [[1, -1], [2, -2], [3, -3], [4, -4]],
  [[1, -1], [1, -2], [2, -3], [3, -4]],
  [[0, -1], [1, -2], [1, -3], [2, -4]],
  [[0, -1], [0, -2], [1, -3], [1, -4]],
]);

export function hitTileOffsetListToString(offsetsList: [number, number][][]) {
  return offsetsList.map(offsets => (
    `[${offsets.map((offset, index) => (
      `[int8(${offset[0]}), ${offset[1]}]${index < offsets.length - 1 ? ', ' : ''}`
    )).join('')}]`
  )).join(',\n');
}

function calcRelativeOffsets(offsets: number[][], origin: number[]) {
  return offsets.map(offset => [offset[0] - origin[0], offset[1] - origin[1]]);
}

export function calcPositionFromChallengeTiles(
  challengeTiles: {xValues: number[], yValues: number[]}
) {
  const arrayifiedTiles = challengeTiles.xValues.map((x, index) => [x, challengeTiles.yValues[index]]);
  const originTile = arrayifiedTiles[0];
  const relativeOffsets = calcRelativeOffsets(arrayifiedTiles, originTile);

  const matchingOffsets = spearHitTileOffsetList.find(offsets => {
    return isEqual(relativeOffsets, calcRelativeOffsets(offsets, offsets[0]));
  }) as number[][];
  return {x: originTile[0] - matchingOffsets[0][0], y: originTile[1] - matchingOffsets[0][1]};
}
