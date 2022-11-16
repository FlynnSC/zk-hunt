import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {defineComponentSystem, defineSyncSystem, EntityIndex, getComponentValue, HasValue} from '@latticexyz/recs';
import {Sprites} from '../constants';
import {getMapTileValue, getParsedMapDataFromComponent} from '../../../utils/mapData';
import {TileType} from '../../../constants';
import {setPersistedComponent} from '../../../utils/persistedComponent';
import {drawTileSprite} from '../../../utils/drawing';

export function createLocalPositionSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    components: {Position, ControlledBy, MapData, LoadingState},
    network: {connectedAddress}
  } = network;

  const {
    scenes: {Main},
    components: {LocalPosition, LocallyControlled},
  } = phaser;

  // Updates locally controlled to true for entities controlled by the local player
  defineSyncSystem(
    world,
    [HasValue(ControlledBy, {value: connectedAddress.get()})],
    () => LocallyControlled, () => ({value: true})
  );

  // Updates the local position when the contract position changes
  defineComponentSystem(world, Position, ({entity, value}) => {
    const position = value[0];

    const locallyOwned = Boolean(getComponentValue(LocallyControlled, entity)?.value);
    if (position) {
      // Updates the local position of the entity, and persists the value if locally controlled
      const persist = locallyOwned && getComponentValue(LoadingState, 0 as EntityIndex)?.state === 2;
      setPersistedComponent(LocalPosition, entity, position, persist);
    }

    // Removes the player sprite if the entity loses its position, or is externally controlled and
    // enters the jungle
    const parsedMapData = getParsedMapDataFromComponent(MapData);
    if (!position || (!locallyOwned && getMapTileValue(parsedMapData, position) === TileType.JUNGLE)) {
      Main.objectPool.remove(`PlayerSprite-${entity}`);
    }
  });

  // Updates the sprite of entities when their local position changes
  defineComponentSystem(world, LocalPosition, ({entity, value}) => {
    const position = value[0];

    if (position) {
      const tint = getComponentValue(LocallyControlled, entity) ? 0xffffff : 0xff7070;
      drawTileSprite(Main, `PlayerSprite-${entity}`, position, Sprites.Donkey, {depth: 0, tint});
    }
  });
}
