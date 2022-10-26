import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {defineComponentSystem} from '@latticexyz/recs';
import {MAP_SIZE} from '../../../constants';
import {Tileset} from '../assets/tilesets/overworldTileset';
import {getParsedMapDataFromComponent} from '../../../utils/mapData';

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
    const parsedMapData = getParsedMapDataFromComponent(MapData);
    for (let i = 0; i < MAP_SIZE * MAP_SIZE; ++i) {
      const x = i % MAP_SIZE;
      const y = Math.floor(i / MAP_SIZE);
      MainMap.putTileAt({x, y}, Tileset.Grass);

      if ((parsedMapData.map >> BigInt(i)) & ONE) {
        MainMap.putTileAt({x, y}, Tileset.Tree7, 'Foreground');
      }
    }
  });
}
