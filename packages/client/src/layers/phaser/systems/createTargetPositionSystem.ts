import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {defineComponentSystem} from '@latticexyz/recs';
import {tileCoordToPixelCoord} from '@latticexyz/phaserx';
import {TILE_HEIGHT, TILE_WIDTH} from '../constants';

export function createTargetPositionSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
  } = network;

  const {
    scenes: {Main: {objectPool}},
    components: {TargetPosition}
  } = phaser;

  // Updates the target rect when the local player's character's target position change
  defineComponentSystem(world, TargetPosition, update => {
    const targetPosition = update.value[0];
    if (targetPosition) {
      const targetRectangle = objectPool.get(`${update.entity}targetRect`, 'Rectangle');
      targetRectangle.setComponent({
        id: 'TargetPositionRect',
        once: gameObject => {
          const pixelPosition = tileCoordToPixelCoord(targetPosition, TILE_WIDTH, TILE_HEIGHT);
          gameObject.setPosition(pixelPosition.x, pixelPosition.y);
          gameObject.setSize(TILE_WIDTH, TILE_HEIGHT);
          gameObject.setFillStyle(255, 0.4);
        },
      });
    }
  });
}
