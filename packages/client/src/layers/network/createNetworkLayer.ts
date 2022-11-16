import {createWorld, EntityID} from '@latticexyz/recs';
import {setupDevSystems} from './setup';
import {
  createActionSystem,
  defineBoolComponent,
  defineCoordComponent,
  defineNumberComponent,
  defineStringComponent,
  setupContracts
} from '@latticexyz/std-client';
import {defineLoadingStateComponent} from './components';
import {SystemTypes} from '../../../../contracts/types/SystemTypes';
import {SystemAbis} from '../../../../contracts/types/SystemAbis.mjs';
import {GameConfig, getNetworkConfig} from './config';
import {Coord} from '@latticexyz/utils';
import {BigNumberish} from 'ethers';
import {defineMapDataComponent} from './components/MapDataComponent';
import {defineHitTilesComponent} from './components/HitTilesComponent';
import {Direction} from '../../constants';
import {defineCoordArrayComponent, defineStringArrayComponent} from '../../utils/components';
import {ComponentValueFromComponent} from '../../utils/misc';

/**
 * The Network layer is the lowest layer in the client architecture.
 * Its purpose is to synchronize the client components with the contract components.
 */
export async function createNetworkLayer(config: GameConfig) {
  console.log('Network config', config);

  // --- WORLD ----------------------------------------------------------------------
  const world = createWorld();

  // --- COMPONENTS -----------------------------------------------------------------
  const components = {
    LoadingState: defineLoadingStateComponent(world),
    Position: defineCoordComponent(world, {
      id: 'Position',
      metadata: {
        contractId: 'zkhunt.component.Position',
      },
    }),
    // TODO change this and mapData to components that can represent uint256
    PositionCommitment: defineStringComponent(world, {
      id: 'PositionCommitment',
      metadata: {contractId: 'zkhunt.component.PositionCommitment'}
    }),
    MapData: defineMapDataComponent(world),
    ControlledBy: defineStringComponent(world, {
      id: 'ControlledBy',
      metadata: {contractId: 'zkhunt.component.ControlledBy'}
    }),
    JungleMoveCount: defineNumberComponent(world, {
      id: 'JungleMoveCount',
      metadata: {contractId: 'zkhunt.component.JungleMoveCount'}
    }),
    HitTiles: defineHitTilesComponent(world),
    PotentialHits: defineStringArrayComponent(world, {
      id: 'PotentialHits',
      metadata: {contractId: 'zkhunt.component.PotentialHits'},
    }),
    Dead: defineBoolComponent(world, {
      id: 'Dead',
      metadata: {contractId: 'zkhunt.component.Dead'}
    }),
    RevealedPotentialPositions: defineCoordArrayComponent(world, {
      id: 'RevealedPotentialPositions',
      metadata: {contractId: 'zkhunt.component.RevealedPotentialPositions'},
    }),
  };

  // --- SETUP ----------------------------------------------------------------------
  const {txQueue, systems, txReduced$, network, startSync, encoders} = await setupContracts<typeof components,
    SystemTypes>(getNetworkConfig(config), world, components, SystemAbis);

  // --- ACTION SYSTEM --------------------------------------------------------------
  const actions = createActionSystem(world, txReduced$);

  // --- API ------------------------------------------------------------------------
  function spawn(controller: string) {
    systems['zkhunt.system.Spawn'].executeTyped(controller);
  }

  function plainsMove(entity: EntityID, newPosition: Coord) {
    systems['zkhunt.system.PlainsMove'].executeTyped(entity, newPosition);
  }

  function jungleEnter(entity: EntityID, newPosition: Coord, commitment: BigNumberish, proofData: string[]) {
    systems['zkhunt.system.JungleEnter'].executeTyped(entity, newPosition, commitment, proofData);
  }

  function jungleMove(entity: EntityID, commitment: BigNumberish, proofData: string[]) {
    systems['zkhunt.system.JungleMove'].executeTyped(entity, commitment, proofData);
  }

  function jungleExit(entity: EntityID, oldPosition: Coord, oldPositionNonce: number, newPosition: Coord) {
    systems['zkhunt.system.JungleExit'].executeTyped(entity, oldPosition, oldPositionNonce, newPosition);
  }

  function attack(entity: EntityID, hitTilesEntity: EntityID, direction: Direction) {
    systems['zkhunt.system.Attack'].executeTyped(entity, hitTilesEntity, direction);
  }

  function jungleAttack(entity: EntityID, position: Coord, proofData: string[], hitTilesEntity: EntityID, direction: Direction) {
    systems['zkhunt.system.JungleAttack'].executeTyped(entity, position, proofData, hitTilesEntity, direction);
  }

  function jungleHitAvoid(entity: EntityID, hitTilesEntity: EntityID, proofData: string[]) {
    systems['zkhunt.system.JungleHitAvoid'].executeTyped(entity, hitTilesEntity, proofData);
  }

  function jungleHitReceive(entity: EntityID, hitTilesEntity: EntityID, position: Coord, nonce: number) {
    systems['zkhunt.system.JungleHitReceive'].executeTyped(entity, hitTilesEntity, position, nonce);
  }

  type PotentialPositions = ComponentValueFromComponent<typeof components.RevealedPotentialPositions>;

  function revealPotentialPositions(entity: EntityID, potentialPositions: PotentialPositions, proofData: string[]) {
    systems['zkhunt.system.RevealPotentialPositions'].executeTyped(entity, potentialPositions, proofData);
  }

  // --- CONTEXT --------------------------------------------------------------------
  const context = {
    world,
    components,
    txQueue,
    systems,
    txReduced$,
    startSync,
    network,
    actions,
    api: {
      spawn, plainsMove, jungleEnter, jungleMove, jungleExit, attack, jungleAttack, jungleHitAvoid,
      jungleHitReceive, revealPotentialPositions
    },
    dev: setupDevSystems(world, encoders, systems),
  };

  return context;
}
