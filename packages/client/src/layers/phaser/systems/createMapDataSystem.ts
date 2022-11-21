import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {defineComponentSystem} from '@latticexyz/recs';
import {MAP_SIZE} from '../../../constants';
import {Tileset} from '../assets/tilesets/overworldTileset';
import {getParsedMapData} from '../../../utils/mapData';
import {indexToPosition} from '../../../utils/coords';

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
    }
  } = phaser;

  defineComponentSystem(world, MapData, () => {
    const parsedMapData = getParsedMapData(MapData);
    for (let i = 0; i < MAP_SIZE * MAP_SIZE; ++i) {
      const position = indexToPosition(i);
      MainMap.putTileAt(position, Tileset.Grass);

      if ((parsedMapData.map >> BigInt(i)) & ONE) {
        MainMap.putTileAt(position, Tileset.Tree7, 'Foreground');
      }
    }
  });
}
