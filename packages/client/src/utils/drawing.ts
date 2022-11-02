import {PhaserLayer} from '../layers/phaser';
import {Coord} from '@latticexyz/utils';
import {tileCoordToPixelCoord} from '@latticexyz/phaserx';
import {TILE_HEIGHT, TILE_WIDTH} from '../layers/phaser/constants';

type ObjectPool = PhaserLayer['scenes']['Main']['objectPool'];

export function drawRect(
  objectPool: ObjectPool, id: string, position: Coord, fillColor: number, fillAlpha = 0.4
) {
  objectPool.get(id, 'Rectangle').setComponent({
    id,
    once: gameObject => {
      const pixelPosition = tileCoordToPixelCoord(position, TILE_WIDTH, TILE_HEIGHT);
      gameObject.setPosition(pixelPosition.x, pixelPosition.y);
      gameObject.setSize(TILE_WIDTH, TILE_HEIGHT);
      gameObject.setFillStyle(fillColor, fillAlpha);
    },
  });
}