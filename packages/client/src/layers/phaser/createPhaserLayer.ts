import {namespaceWorld} from '@latticexyz/recs';
import {createPhaserEngine} from '@latticexyz/phaserx';
import {phaserConfig} from './config';
import {NetworkLayer} from '../network';
import {createEntitySelectionSystem} from './systems/createEntitySelectionSystem';
import {defineBoolComponent, defineCoordComponent, defineNumberComponent} from '@latticexyz/std-client';
import {definePotentialPositionsComponent} from './components/PotentialPositionsComponent';
import {createLocalPositionSystem} from './systems/createLocalPositionSystem';
import {createJungleMovementSystem} from './systems/createJungleMovementSystem';
import {restorePersistedComponents} from '../../utils/persistedComponent';
import {createMapDataSystem} from './systems/createMapDataSystem';
import {createHitSystem} from './systems/createHitSystem';
import {createDeadSystem} from './systems/createDeadSystem';
import {definePotentialMovePathComponent} from './components/PotentialMovePathComponent';
import {onStateSyncComplete} from '../../utils/onStateSyncComplete';
import {defineSelectedComponent} from './components/SelectedComponent';
import {defineMovePathComponent} from './components/MovePathComponent';
import {createMovePathSystem} from './systems/createMovePathSystem';

/**
 * The Phaser layer is responsible for rendering game objects to the screen.
 */
export async function createPhaserLayer(network: NetworkLayer) {
  // --- WORLD ----------------------------------------------------------------------
  const world = namespaceWorld(network.world, 'phaser');

  // --- COMPONENTS -----------------------------------------------------------------
  const components = {
    LocalPosition: defineCoordComponent(world, {id: 'LocalPosition'}),
    PotentialPositions: definePotentialPositionsComponent(world),
    Nonce: defineNumberComponent(world, {id: 'Nonce'}),
    LocallyControlled: defineBoolComponent(world, {id: 'LocallyControlled'}),
    PotentialMovePath: definePotentialMovePathComponent(world),
    MovePath: defineMovePathComponent(world),
    Selected: defineSelectedComponent(world),
    CursorTilePosition: defineCoordComponent(world, {id: 'CursorTilePosition'}),
    PendingMovePosition: defineCoordComponent(world, {id: 'PendingMovePosition'}),
    // This will be the pending move position if the entity has one,
    // otherwise it will be the local position
    ActionSourcePosition: defineCoordComponent(world, {id: 'ActionSourcePosition'}),
  };

  onStateSyncComplete(network, () => restorePersistedComponents(components));

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
  createEntitySelectionSystem(network, context);
  createMapDataSystem(network, context);
  createLocalPositionSystem(network, context);
  createJungleMovementSystem(network, context);
  createHitSystem(network, context);
  createDeadSystem(network, context);
  createMovePathSystem(network, context);

  return context;
}
