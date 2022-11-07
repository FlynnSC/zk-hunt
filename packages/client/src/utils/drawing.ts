import {PhaserLayer} from '../layers/phaser';
import {Coord} from '@latticexyz/utils';
import {tileCoordToPixelCoord} from '@latticexyz/phaserx';
import {TILE_HEIGHT, TILE_WIDTH} from '../layers/phaser/constants';
import {EntityIndex} from '@latticexyz/recs';
import {positionToIndex} from './coords';

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

type TilesType = {xValues: number[], yValues: number[]};

export function drawTileRects(
  objectPool: ObjectPool, entity: EntityIndex, id: string, currTiles: TilesType | undefined,
  prevTiles: TilesType | undefined, fillColor: number, fillAlpha = 0.4
) {
  const seenTileIndices = new Set<number>();
  if (currTiles) {
    currTiles.xValues.forEach((x, index) => {
      const position = {x, y: currTiles.yValues[index]};
      const positionIndex = positionToIndex(position);
      drawRect(objectPool, `${id}-${entity}-${positionIndex}`, position, fillColor, fillAlpha);
      seenTileIndices.add(positionToIndex(position));
    });
  }

  if (prevTiles) {
    prevTiles.xValues.forEach((x, index) => {
      const position = {x, y: prevTiles.yValues[index]};
      const positionIndex = positionToIndex(position);
      if (!seenTileIndices.has(positionToIndex(position))) {
        objectPool.remove(`${id}-${entity}-${positionIndex}`);
      }
    });
  }
}
