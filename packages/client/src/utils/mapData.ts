import {Coord} from '@latticexyz/utils';
import {BITS_PER_CHUNK, MAP_SIZE, TileType} from '../constants';
import {getComponentValueStrict} from '@latticexyz/recs';
import {GodID} from '@latticexyz/network';
import {defineMapDataComponent} from '../layers/network/components/MapDataComponent';

const ONE = BigInt(1);

// [0x230000008e0701400dee07e0004c1bf8003c00381018003c70060001f0040007, 0x1fe0a0009fc006033f1e0c0e383c3c3c6078f03c807000e0000000c4000003, 0x3d07cf00020e0a00001c0408002001101c0406307c0d01f0f00e03e1c01f0382, 0x3893ffc3e1615e0383808002000000000000f000785fe087e1f]

interface ParsedMapData {
  map: bigint;
  chunks: bigint[];
  intermediaryNodes: bigint[];
  root: bigint;
}

function calcTileIndex(position: Coord) {
  return position.x + position.y * MAP_SIZE;
}

export function getParsedMapDataFromComponent(
  mapDataComponent: ReturnType<typeof defineMapDataComponent>
): ParsedMapData {
  const godEntityIndex = mapDataComponent.world.getEntityIndexStrict(GodID);
  const mapData = getComponentValueStrict(mapDataComponent, godEntityIndex);
  const chunks = mapData.chunks.map(chunk => BigInt(chunk));
  const intermediaryNodes = mapData.intermediaryNodes.map(node => BigInt(node));
  const map = chunks.reduce((acc, chunk, index) => {
    return acc + (chunk << (BigInt(BITS_PER_CHUNK) * BigInt(index)));
  }, BigInt(0));
  return {map, chunks, intermediaryNodes, root: BigInt(mapData.root)};
}

export function getMapTileValue(parsedMapData: ParsedMapData, position: Coord) {
  return Number((parsedMapData.map >> BigInt(calcTileIndex(position))) & ONE) as TileType;
}

function intDiv(val: number, div: number) {
  return Math.floor(val / div);
}

export function getMapTileMerkleData(parsedMapData: ParsedMapData, position: Coord) {
  const {chunks, intermediaryNodes, root} = parsedMapData;
  const chunkIndex = intDiv(calcTileIndex(position), BITS_PER_CHUNK);

  // TODO make properly general
  // Finds the siblings of the merkle path from the bottom up
  const mapDataMerkleSiblings: bigint[] = [];
  // const nodes = [...intermediaryNodes, chunks];
  // const convertIndex = (index: number) => nodes.length - index + 1;
  // let nodeIndex = chunkIndex + chunks.length; // Node index top down where the root is index 1
  // while (nodeIndex > 1) {
  //   if (nodeIndex % 2 === 0) {
  //
  //   }
  // }
  //
  // let accNodeCount = 0;
  // for (let rowNodeCount = parsedMapData.chunks.length; rowNodeCount > 1; rowNodeCount /= 2) {
  //   if (rowNodeCount === parsedMapData.chunks.length) {
  //     mapDataMerkleSiblings.push(chunks[intDiv(chunkIndex, rowNodeCount)]);
  //   } else {
  //     console.log({accNodeCount});
  //     console.log({chunkIndex});
  //     console.log({rowNodeCount});
  //     console.log({thing: intDiv(chunkIndex * rowNodeCount, chunks.length)});
  //     console.log(accNodeCount + intDiv(chunkIndex * rowNodeCount, chunks.length));
  //     mapDataMerkleSiblings.push(intermediaryNodes[accNodeCount + intDiv(chunkIndex * rowNodeCount, chunks.length)]);
  //   }
  //   accNodeCount += rowNodeCount;
  // }
  // console.log(mapDataMerkleSiblings);
  if (chunkIndex < 2) {
    mapDataMerkleSiblings.push(chunks[1 - chunkIndex]);
    mapDataMerkleSiblings.push(intermediaryNodes[1]);
  } else {
    mapDataMerkleSiblings.push(chunks[5 - chunkIndex]);
    mapDataMerkleSiblings.push(intermediaryNodes[0]);
  }

  return {
    mapDataMerkleLeaf: chunks[chunkIndex],
    mapDataMerkleSiblings,
    mapDataMerkleRoot: root
  };
}
