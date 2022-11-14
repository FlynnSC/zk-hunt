import {PhaserLayer} from '../layers/phaser';
import {Coord} from '@latticexyz/utils';
import {tileCoordToPixelCoord} from '@latticexyz/phaserx';
import {Sprites, TILE_HEIGHT, TILE_WIDTH} from '../layers/phaser/constants';
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

type MainScene = PhaserLayer['scenes']['Main'];

export function drawTileSprite(
  scene: MainScene, id: string, position: Coord, sprite: Sprites,
  opts?: {alpha?: number, tint?: number, depth?: number, rotation?: number},
) {
  scene.objectPool.get(id, 'Sprite').setComponent({
    id,
    once: gameObject => {
      const pixelPosition = tileCoordToPixelCoord(position, TILE_WIDTH, TILE_HEIGHT);
      const texture = scene.config.sprites[sprite];
      gameObject.setOrigin(0.5, 0.5);
      gameObject.setPosition(pixelPosition.x + TILE_WIDTH / 2, pixelPosition.y + TILE_WIDTH / 2);
      gameObject.setTexture(texture.assetKey, texture.frame);

      if (opts?.depth !== undefined) {
        gameObject.setDepth(opts.depth);
      } else {
        gameObject.setDepth(4);
      }
      if (opts?.alpha !== undefined) gameObject.setAlpha(opts.alpha);
      if (opts?.tint !== undefined) gameObject.setTint(opts.tint, opts.tint, opts.tint, opts.tint);
      if (opts?.rotation !== undefined) {
        gameObject.setRotation(opts.rotation / 180 * Math.PI);
      } else {
        // If rotation is set on some gameObjects and not others, shit can get wacky
        gameObject.setRotation(0);
      }
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

export function drawTileSprites(
  scene: MainScene, entity: EntityIndex, id: string, currTiles: TilesType | undefined,
  prevTiles: TilesType | undefined, sprite: Sprites,
  opts?: {alpha?: number, tint?: number, depth?: number},
) {
  const seenTileIndices = new Set<number>();
  if (currTiles) {
    currTiles.xValues.forEach((x, index) => {
      const position = {x, y: currTiles.yValues[index]};
      const positionIndex = positionToIndex(position);
      drawTileSprite(scene, `${id}-${entity}-${positionIndex}`, position, sprite, opts);
      seenTileIndices.add(positionToIndex(position));
    });
  }

  if (prevTiles) {
    prevTiles.xValues.forEach((x, index) => {
      const position = {x, y: prevTiles.yValues[index]};
      const positionIndex = positionToIndex(position);
      if (!seenTileIndices.has(positionToIndex(position))) {
        scene.objectPool.remove(`${id}-${entity}-${positionIndex}`);
      }
    });
  }
}
