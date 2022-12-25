import {NetworkLayer} from '../../../network';
import {PhaserLayer} from '../../types';
import {createChallengeRenderingSystem} from './createChallengeRenderingSystem';
import {createChallengeCreationSystem} from './createChallengeCreationSystem';
import {createHiddenChallengeResponseSystem} from './createHiddenChallengeResponseSystem';
import {createChallengeResponseSystem} from './createChallengeResponseSystem';

export function createChallengeSystem(network: NetworkLayer, phaser: PhaserLayer) {
  createChallengeCreationSystem(network, phaser);
  createChallengeResponseSystem(network, phaser);
  createHiddenChallengeResponseSystem(network, phaser);
  createChallengeRenderingSystem(phaser);
}
