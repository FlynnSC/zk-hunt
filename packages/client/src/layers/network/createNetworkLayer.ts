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
    PendingChallengeCount: defineStringComponent(world, {
      id: 'PendingChallengeCount',
      metadata: {contractId: 'zkhunt.component.PendingChallengeCount'}
    }),
    PublicKey: defineStringArrayComponent(world, {
      id: 'PublicKey',
      metadata: {contractId: 'zkhunt.component.PublicKey'}
    }),
    SearchResult: defineSearchResultComponent(world),
    HiddenChallenge: defineHiddenChallengeComponent(world),
    NullifierQueue: defineNullifierQueueComponent(world),
    LootCount: defineStringComponent(world, {
      id: 'LootCount',
      metadata: {contractId: 'zkhunt.component.LootCount'}
    })
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

  function attack(entity: EntityID, challengeTilesEntity: EntityID, direction: Direction) {
    systems['zkhunt.system.Attack'].executeTyped(entity, challengeTilesEntity, direction);
  }

  function jungleAttack(entity: EntityID, position: Coord, proofData: string[], challengeTilesEntity: EntityID, direction: Direction) {
    systems['zkhunt.system.JungleAttack'].executeTyped(entity, position, proofData, challengeTilesEntity, direction);
  }

  function jungleHitAvoid(entity: EntityID, challengeTilesEntity: EntityID, proofData: string[]) {
    systems['zkhunt.system.JungleHitAvoid'].executeTyped(entity, challengeTilesEntity, proofData);
  }

  function jungleHitReceive(entity: EntityID, challengeTilesEntity: EntityID, position: Coord, nonce: number) {
    systems['zkhunt.system.JungleHitReceive'].executeTyped(entity, challengeTilesEntity, position, nonce);
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

  function loot(entity: EntityID, entityToLoot: EntityID) {
    systems['zkhunt.system.Loot'].executeTyped(entity, entityToLoot);
  }

  function jungleLoot(entity: EntityID, entityToLoot: EntityID, position: Coord, proofData: BigNumberish[]) {
    systems['zkhunt.system.JungleLoot'].executeTyped(entity, entityToLoot, position, proofData);
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
      hiddenSearch, hiddenSearchRespond, hiddenSearchLiquidate, loot, jungleLoot
    },
    dev: setupDevSystems(world, encoders, systems)
  };

  return context;
}
