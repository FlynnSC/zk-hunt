import {createWorld, EntityID} from '@latticexyz/recs';
import {setupDevSystems} from './setup';
import {
  createActionSystem,
  defineBoolComponent,
  defineCoordComponent,
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
import {defineChallengeTilesComponent} from './components/ChallengeTilesComponent';
import {defineSearchResultComponent} from './components/SearchResultComponent';
import {defineHiddenChallengeComponent} from './components/HiddenChallengeComponent';
import {defineNullifierQueueComponent} from './components/NullifierQueueComponent';

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
      metadata: {contractId: 'zkhunt.component.Position'}
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
    JungleMoveCount: defineStringComponent(world, {
      id: 'JungleMoveCount',
      metadata: {contractId: 'zkhunt.component.JungleMoveCount'}
    }),
    HitTiles: defineHitTilesComponent(world),
    PotentialHits: defineStringArrayComponent(world, {
      id: 'PotentialHits',
      metadata: {contractId: 'zkhunt.component.PotentialHits'}
    }),
    Dead: defineBoolComponent(world, {
      id: 'Dead',
      metadata: {contractId: 'zkhunt.component.Dead'}
    }),
    RevealedPotentialPositions: defineCoordArrayComponent(world, {
      id: 'RevealedPotentialPositions',
      metadata: {contractId: 'zkhunt.component.RevealedPotentialPositions'}
    }),
    ChallengeTiles: defineChallengeTilesComponent(world),
    PendingChallenges: defineStringArrayComponent(world, {
      id: 'PendingChallenges',
      metadata: {contractId: 'zkhunt.component.PendingChallenges'}
    }),
    PublicKey: defineStringArrayComponent(world, {
      id: 'PublicKey',
      metadata: {contractId: 'zkhunt.component.PublicKey'}
    }),
    SearchResult: defineSearchResultComponent(world),
    HiddenChallenge: defineHiddenChallengeComponent(world),
    NullifierQueue: defineNullifierQueueComponent(world)
  };

  // --- SETUP ----------------------------------------------------------------------
  const {txQueue, systems, txReduced$, network, startSync, encoders} = await setupContracts<typeof components,
    SystemTypes>(getNetworkConfig(config), world, components, SystemAbis);

  // --- ACTION SYSTEM --------------------------------------------------------------
  const actions = createActionSystem(world, txReduced$);

  // --- API ------------------------------------------------------------------------
  function init(mapDataChunks: BigNumberish[]) {
    systems['zkhunt.system.Init'].executeTyped(mapDataChunks);
  }

  function spawn(publicKey: BigNumberish[]) {
    return systems['zkhunt.system.Spawn'].executeTyped(publicKey);
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

  function search(entity: EntityID, challengeTilesEntity: EntityID, direction: Direction) {
    systems['zkhunt.system.Search'].executeTyped(entity, challengeTilesEntity, direction);
  }

  function searchRespond(entity: EntityID, challengeTilesEntity: EntityID, cipherText: BigNumberish[], encryptionNonce: BigNumberish, proofData: BigNumberish[]) {
    systems['zkhunt.system.SearchResponse'].executeTyped(entity, challengeTilesEntity, cipherText as [BigNumberish, BigNumberish, BigNumberish, BigNumberish], encryptionNonce, proofData);
  }

  function hiddenSearch(entity: EntityID, hiddenChallengeEntity: EntityID, cipherText: BigNumberish[], encryptionNonce: BigNumberish, proofData: BigNumberish[]) {
    systems['zkhunt.system.HiddenSearch'].executeTyped(entity, hiddenChallengeEntity, cipherText, encryptionNonce, proofData);
  }

  function hiddenSearchRespond(entity: EntityID, cipherText: BigNumberish[], encryptionNonce: BigNumberish, nullifier: BigNumberish, proofData: BigNumberish[]) {
    systems['zkhunt.system.HiddenSearchResponse'].executeTyped(entity, cipherText, encryptionNonce, nullifier, proofData);
  }

  function hiddenSearchLiquidate(hiddenChallengeEntity: EntityID, challengedEntity: EntityID, nullifier: BigNumberish, proofData: BigNumberish[]) {
    systems['zkhunt.system.HiddenSearchLiquidation'].executeTyped(hiddenChallengeEntity, challengedEntity, nullifier, proofData);
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
      init, spawn, plainsMove, jungleEnter, jungleMove, jungleExit, attack, jungleAttack,
      jungleHitAvoid, jungleHitReceive, revealPotentialPositions, search, searchRespond,
      hiddenSearch, hiddenSearchRespond, hiddenSearchLiquidate
    },
    dev: setupDevSystems(world, encoders, systems)
  };

  return context;
}
