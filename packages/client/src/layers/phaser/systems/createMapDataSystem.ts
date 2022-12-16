import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {defineComponentSystem, setComponent} from '@latticexyz/recs';
import {BITS_PER_CHUNK, MAP_SIZE} from '../../../constants';
import {Tileset} from '../assets/tilesets/overworldTileset';
import {indexToPosition} from '../../../utils/coords';
import {poseidon} from '../../../utils/secretSharing';

const ONE = BigInt(1);

export function createMapDataSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    components: {MapData}
  } = network;

  const {
    scenes: {
      Main: {
        maps: {
          MainMap
        }
      }
    },
    components: {ParsedMapData}
  } = phaser;

  defineComponentSystem(world, MapData, ({entity, value}) => {
    const mapData = value[0];
    if (!mapData) return;

    const chunks = mapData.chunks;
    const mapValue = chunks.reduce((acc, chunk, index) => {
      return acc + (BigInt(chunk) << (BigInt(BITS_PER_CHUNK) * BigInt(index)));
    }, BigInt(0)).toString();

    // 1 based array representing the merklisation of the chunks, where the root is at index 1
    const nodes = new Array<bigint>(chunks.length * 2);
    const resolveSubTree = (currIndex: number, subTreeLeafCount: number) => {
      if (subTreeLeafCount === 1) {
        // currIndex - chunks.length is the leaf index
        nodes[currIndex] = BigInt(chunks[currIndex - chunks.length]);
      } else {
        const leftIndex = 2 * currIndex, rightIndex = 2 * currIndex + 1;
        resolveSubTree(leftIndex, subTreeLeafCount / 2);
        resolveSubTree(rightIndex, subTreeLeafCount / 2);
        nodes[currIndex] = poseidon(BigInt(nodes[leftIndex]), BigInt(nodes[rightIndex]));
      }
    };
    resolveSubTree(1, chunks.length);

    setComponent(ParsedMapData, entity, {mapValue, chunks, nodes: nodes.map(n => n.toString())});
  });

  defineComponentSystem(world, ParsedMapData, ({value}) => {
    const mapData = value[0];
    if (!mapData) return;

    const mapValue = BigInt(mapData.mapValue);
    for (let i = 0; i < MAP_SIZE * MAP_SIZE; ++i) {
      const position = indexToPosition(i);
      MainMap.putTileAt(position, Tileset.Grass);

      if ((mapValue >> BigInt(i)) & ONE) {
        MainMap.putTileAt(position, Tileset.Tree7, 'Foreground');
      }
    }
  });
}
