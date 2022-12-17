import {Coord} from '@latticexyz/utils';
import {BITS_PER_CHUNK, MAP_SIZE, TileType} from '../constants';
import {intDiv} from './misc';
import {defineParsedMapDataComponent} from '../layers/phaser/components/ParsedMapDataComponent';
import {getSingletonComponentValueStrict} from './singletonComponent';

const ONE = BigInt(1);

export function getMapDataChunks() {
  // 31 * 31
  return [
    '0x30000008e0701400dfe07e0007c1ffc003c3ffc1018263c70060801f00c0007',
    '0x1fe0a0009fc006033f1e0c0e383c3c3c6078f03c807000e0000001c4000006',
    '0x1d07cf00020e0a00001c0408002001101c0406307c1d01f0f00e03e1c01f0382',
    '0x3893ffc3e1615e0383808002000000000000f00078dfe087e38'
  ];
}

function calcTileIndex(position: Coord) {
  return position.x + position.y * MAP_SIZE;
}

type ParsedMapDataComponent = ReturnType<typeof defineParsedMapDataComponent>;

export function getMapTileValue(parsedMapDataComponent: ParsedMapDataComponent, position: Coord) {
  const mapData = getSingletonComponentValueStrict(parsedMapDataComponent);
  return Number((BigInt(mapData.mapValue) >> BigInt(calcTileIndex(position))) & ONE) as TileType;
}

export function isMapTileJungle(parsedMapDataComponent: ParsedMapDataComponent, position: Coord) {
  return getMapTileValue(parsedMapDataComponent, position) === TileType.JUNGLE;
}

// Used in jungleMove proof generation
export function getMapTileMerkleData(
  parsedMapDataComponent: ParsedMapDataComponent, position: Coord
) {
  const mapData = getSingletonComponentValueStrict(parsedMapDataComponent);
  const chunkIndex = intDiv(calcTileIndex(position), BITS_PER_CHUNK);
  let nodeIndex = chunkIndex + mapData.chunks.length;

  // Finds the siblings of the merkle path from the bottom up
  const mapDataMerkleSiblings: string[] = [];
  while (nodeIndex !== 1) {
    const siblingIndex = nodeIndex % 2 === 0 ? nodeIndex + 1 : nodeIndex - 1;
    mapDataMerkleSiblings.push(mapData.nodes[siblingIndex]);
    nodeIndex = intDiv(nodeIndex, 2);
  }

  return {
    mapDataMerkleLeaf: mapData.chunks[chunkIndex],
    mapDataMerkleSiblings,
    mapDataMerkleRoot: mapData.nodes[1]
  };
}
