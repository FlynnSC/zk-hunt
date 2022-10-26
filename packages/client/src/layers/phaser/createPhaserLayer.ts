import {EntityIndex, namespaceWorld} from '@latticexyz/recs';
import {createPhaserEngine} from '@latticexyz/phaserx';
import {phaserConfig} from './config';
import {NetworkLayer} from '../network';
import {createInputSystem} from './systems/createInputSystem';
import {
  defineBoolComponent,
  defineCoordComponent,
  defineNumberComponent,
  waitForComponentValue
} from '@latticexyz/std-client';
import {definePotentialPositionsComponent} from './components/PotentialPositionsComponent';
import {createLocalPositionSystem} from './systems/createLocalPositionSystem';
import {createTargetPositionSystem} from './systems/createTargetPositionSystem';
import {createJungleMovementSystem} from './systems/createJungleMovementSystem';
import {restorePersistedComponents} from '../../utils/persistedComponent';
import {createMapDataSystem} from './systems/createMapDataSystem';
import {createHitTilesSystem} from './systems/createHitTilesSystem';
import {createDeadSystem} from './systems/createDeadSystem';

/**
 * The Phaser layer is responsible for rendering game objects to the screen.
 */
export async function createPhaserLayer(network: NetworkLayer) {
  // --- WORLD ----------------------------------------------------------------------
  const world = namespaceWorld(network.world, 'phaser');

  // --- COMPONENTS -----------------------------------------------------------------
  const components = {
    LocalPosition: defineCoordComponent(world, {id: 'LocalPosition'}),
    TargetPosition: defineCoordComponent(world, {id: 'TargetPosition'}),
    PotentialPositions: definePotentialPositionsComponent(world),
    Nonce: defineNumberComponent(world, {id: 'Nonce'}),
    LocallyControlled: defineBoolComponent(world, {id: 'LocallyControlled'}),
  };

  const entity0 = 0 as EntityIndex;
  waitForComponentValue(network.components.LoadingState, entity0, {state: 2}).then(() => {
    restorePersistedComponents(components);
  });

  // --- PHASER ENGINE SETUP --------------------------------------------------------
  const {game, scenes, dispose: disposePhaser} = await createPhaserEngine(phaserConfig);
  world.registerDisposer(disposePhaser);

  // --- LAYER CONTEXT --------------------------------------------------------------
  const context = {
    world,
    components,
    network,
    game,
    scenes,
  };

  // --- SYSTEMS --------------------------------------------------------------------
  createInputSystem(network, context);
  createMapDataSystem(network, context);
  createLocalPositionSystem(network, context);
  createTargetPositionSystem(network, context);
  createJungleMovementSystem(network, context);
  createHitTilesSystem(network, context);
  createDeadSystem(network, context);

  return context;
}
