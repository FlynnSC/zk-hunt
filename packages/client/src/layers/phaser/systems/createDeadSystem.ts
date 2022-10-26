import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {defineComponentSystem, removeComponent} from '@latticexyz/recs';
import {Sprites} from '../constants';

export function createDeadSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    components: {Dead},
  } = network;

  const {
    scenes: {Main: {objectPool, config}},
    components: {PotentialPositions},
  } = phaser;

  // Draws the hit tiles rect when created, and destroys the sprite when removed
  defineComponentSystem(world, Dead, ({entity}) => {
    removeComponent(PotentialPositions, entity);

    const sprite = objectPool.get(entity, 'Sprite');
    sprite.setComponent({
      id: 'PlayerSprite',
      once: gameObject => {
        const texture = config.sprites[Sprites.Gold];
        gameObject.setTexture(texture.assetKey, texture.frame);
        gameObject.setTint(0xffffff, 0xffffff, 0xffffff, 0xffffff);
      }
    });
  });
}
