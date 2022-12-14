import {namespaceWorld} from '@latticexyz/recs';
import {createPhaserEngine} from '@latticexyz/phaserx';
import {phaserConfig} from './config';
import {NetworkLayer} from '../network';
import {createEntitySelectionSystem} from './systems/createEntitySelectionSystem';
import {
  defineBoolComponent,
  defineCoordComponent,
  defineNumberComponent,
  defineStringComponent
} from '@latticexyz/std-client';
import {createLocalPositionSystem} from './systems/createLocalPositionSystem';
import {createJungleMovementSystem} from './systems/createJungleMovementSystem';
import {restorePersistedComponents} from '../../utils/persistedComponent';
import {createMapDataSystem} from './systems/createMapDataSystem';
import {definePotentialMovePathComponent} from './components/PotentialMovePathComponent';
import {onStateSyncComplete} from '../../utils/onStateSyncComplete';
import {defineSelectedComponent} from './components/SelectedComponent';
import {createMovePathSystem} from './systems/createMovePathSystem';
import {
  defineClientChallengeTilesComponent,
  defineCoordArrayComponent,
  defineEntityIndexComponent
} from '../../utils/components';
import {initPoseidon} from '../../utils/secretSharing';
import {defineConfigComponent} from './components/ConfigComponent';
import {getMapDataChunks} from '../../utils/mapData';
import {defineParsedMapDataComponent} from './components/ParsedMapDataComponent';
import {hasSingletonComponent, setSingletonComponent} from '../../utils/singletonComponent';
import {createChallengeSystem} from './systems/challengeSystem/createChallengeSystem';

/**
 * The Phaser layer is responsible for rendering game objects to the screen.
 */
export async function createPhaserLayer(network: NetworkLayer) {
  // --- WORLD ----------------------------------------------------------------------
  const world = namespaceWorld(network.world, 'phaser');

  // --- COMPONENTS -----------------------------------------------------------------
  const components = {
    ParsedMapData: defineParsedMapDataComponent(world),
    LocalPosition: defineCoordComponent(world, {id: 'LocalPosition'}),
    PotentialPositions: defineCoordArrayComponent(world, {id: 'PotentialPositions'}),
    Nonce: defineNumberComponent(world, {id: 'Nonce'}),
    LocallyControlled: defineBoolComponent(world, {id: 'LocallyControlled'}),
    PotentialMovePath: definePotentialMovePathComponent(world),
    MovePath: defineCoordArrayComponent(world, {id: 'MovePath'}),
    Selected: defineSelectedComponent(world),
    CursorTilePosition: defineCoordComponent(world, {id: 'CursorTilePosition'}),
    PendingMovePosition: defineCoordComponent(world, {id: 'PendingMovePosition'}),
    // This will be the pending move position if the entity has one,
    // otherwise it will be the local position
    ActionSourcePosition: defineCoordComponent(world, {id: 'ActionSourcePosition'}),
    PrimingMove: defineBoolComponent(world, {id: 'PrimingMove'}),
    PrimingAttack: defineBoolComponent(world, {id: 'PrimingAttack'}),
    PrimingSearch: defineBoolComponent(world, {id: 'PrimingSearch'}),
    PrimingChallenge: defineBoolComponent(world, {id: 'PrimingChallenge'}),
    PotentialChallengeTiles: defineClientChallengeTilesComponent(world, {id: 'PotentialChallengeTiles'}),
    PendingChallengeTiles: defineClientChallengeTilesComponent(world, {id: 'PendingChallengeTiles'}),
    ResolvedChallengeTiles: defineClientChallengeTilesComponent(world, {id: 'ResolvedChallengeTiles'}),
    PrivateKey: defineStringComponent(world, {id: 'PrivateKey'}),
    LocalJungleMoveCount: defineNumberComponent(world, {id: 'LocalJungleMoveCount'}),
    LastKnownPositions: defineCoordArrayComponent(world, {id: 'LastKnownPositions'}),

    // Maps an entity to the challenge tiles entity for a hidden challenge, if they have one pending
    PendingHiddenChallengeTilesEntity: defineEntityIndexComponent(
      world,
      {id: 'PendingHiddenChallengeTilesEntity'}
    ),
    Config: defineConfigComponent(world)
  };

  initPoseidon();
  onStateSyncComplete(network, () => {
    restorePersistedComponents(components, network.components.Dead);
    setSingletonComponent(components.Config, {
      ignoreChallenge: false,
      delayHiddenChallengeResponse: false
    });
    if (!hasSingletonComponent(network.components.MapData)) {
      network.api.init(getMapDataChunks());
    }
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
    scenes
  };

  // --- SYSTEMS --------------------------------------------------------------------
  createEntitySelectionSystem(network, context);
  createMapDataSystem(network, context);
  createLocalPositionSystem(network, context);
  createJungleMovementSystem(network, context);
  createMovePathSystem(network, context);
  createChallengeSystem(network, context);

  return context;
}
