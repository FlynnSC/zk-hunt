import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {defineComponentSystem, getComponentValueStrict, removeComponent} from '@latticexyz/recs';
import {Sprites} from '../constants';
import {drawTileSprite} from '../../../utils/drawing';

export function createDeadSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    components: {Dead, Position},
  } = network;

  const {
    scenes: {Main},
    components: {PotentialPositions},
  } = phaser;

  // Draws the hit tiles rect when created, and destroys the sprite when removed
  defineComponentSystem(world, Dead, ({entity}) => {
    removeComponent(PotentialPositions, entity);
    drawTileSprite(
      Main, `PlayerSprite-${entity}`, getComponentValueStrict(Position, entity), Sprites.Gold
    );
  });
}
