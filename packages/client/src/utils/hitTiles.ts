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
  [[1, -1], [2, -2], [3, -2], [4, -3]],
  [[1, -1], [2, -2], [3, -3], [4, -4]],
  [[1, -1], [2, -2], [2, -3], [3, -4]],
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
