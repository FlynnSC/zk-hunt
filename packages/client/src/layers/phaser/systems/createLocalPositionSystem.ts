import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {
  defineComponentSystem,
  defineSyncSystem,
  EntityIndex,
  getComponentValue,
  getComponentValueStrict,
  hasComponent,
  HasValue,
  removeComponent,
  setComponent
} from '@latticexyz/recs';
import {Sprites} from '../constants';
import {isMapTileJungle} from '../../../utils/mapData';
import {setPersistedComponent} from '../../../utils/persistedComponent';
import {drawTileSprite} from '../../../utils/drawing';

export function createLocalPositionSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    components: {Position, ControlledBy, LoadingState, Dead},
    network: {connectedAddress}
  } = network;

  const {
    scenes: {Main},
    components: {LocalPosition, LocallyControlled, LastKnownPositions, ParsedMapData}
  } = phaser;

  // Updates locally controlled to true for entities controlled by the local player
  defineSyncSystem(
    world,
    [HasValue(ControlledBy, {value: connectedAddress.get()})],
    () => LocallyControlled, () => ({value: true})
  );

  // Updates the local position when the contract position changes, as well as the last known
  // positions when entering the jungle
  defineComponentSystem(world, Position, ({entity, value}) => {
    const position = value[0];
    if (position) {
      // Updates the local position of the entity, and persists the value if locally controlled
      const persist = hasComponent(LocallyControlled, entity) &&
        getComponentValue(LoadingState, 0 as EntityIndex)?.state === 2;
      setPersistedComponent(LocalPosition, entity, position, persist);

      // Updates the last known position if inside the jungle
      if (isMapTileJungle(ParsedMapData, position)) {
        setComponent(LastKnownPositions, entity, {xValues: [position.x], yValues: [position.y]});
      }
    } else {
      removeComponent(LocalPosition, entity);
    }
  });

  // Updates the sprite of entities when their local position changes, removes it if the local
  // position is removed (2nd move in the jungle for non-locally controlled entities)
  defineComponentSystem(world, LocalPosition, ({entity, value}) => {
    const position = value[0];

    if (position) {
      const locallyControlled = hasComponent(LocallyControlled, entity);
      const isInJungleTiles = isMapTileJungle(ParsedMapData, position);
      const isDead = hasComponent(Dead, entity);
      const sprite = isDead ? Sprites.Gold : Sprites.Donkey;
      const tint = locallyControlled || isDead ? 0xffffff : 0xff7070;
      const alpha = !locallyControlled && isInJungleTiles && !isDead ? 0.6 : 1;
      drawTileSprite(Main, `PlayerSprite-${entity}`, position, sprite, {depth: 0, tint, alpha});
    } else {
      Main.objectPool.remove(`PlayerSprite-${entity}`);
    }
  });

  // Forces a rerender if an entity dies, so that it shows the gold sprite
  defineComponentSystem(world, Dead, ({entity}) => {
    if (hasComponent(Position, entity)) {
      setComponent(LocalPosition, entity, getComponentValueStrict(Position, entity));
    }
  });
}
