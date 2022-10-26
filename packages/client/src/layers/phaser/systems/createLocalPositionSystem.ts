import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {defineComponentSystem, defineSyncSystem, EntityIndex, getComponentValue, HasValue} from '@latticexyz/recs';
import {Sprites, TILE_HEIGHT, TILE_WIDTH} from '../constants';
import {tileCoordToPixelCoord} from '@latticexyz/phaserx';
import {coordsEq} from '../../../utils/coords';
import {getMapTileValue, getParsedMapDataFromComponent} from '../../../utils/mapData';
import {TileType} from '../../../constants';
import {setPersistedComponent} from '../../../utils/persistedComponent';

export function createLocalPositionSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    components: {Position, ControlledBy, MapData, LoadingState},
    network: {connectedAddress}
  } = network;

  const {
    scenes: {Main: {objectPool, config}},
    components: {LocalPosition, TargetPosition, LocallyControlled},
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
      objectPool.remove(entity);
    }
  });

  // Updates the sprite of entities when their local position changes, as well
  // as removing the target rect when necessary
  defineComponentSystem(world, LocalPosition, ({entity, value}) => {
    const sprite = objectPool.get(entity, 'Sprite');
    const position = value[0];

    // Removes the target rect if the character has moved to its location
    const targetPosition = getComponentValue(TargetPosition, entity);
    if (!targetPosition || coordsEq(position, targetPosition)) {
      objectPool.remove(`${entity}targetRect`);
    }

    if (position) {
      sprite.setComponent({
        id: 'PlayerSprite',
        once: gameObject => {
          const texture = config.sprites[Sprites.Donkey];
          const pixelPosition = tileCoordToPixelCoord(position, TILE_WIDTH, TILE_HEIGHT);
          gameObject.setPosition(pixelPosition.x, pixelPosition.y);
          gameObject.setTexture(texture.assetKey, texture.frame);
          const tint = getComponentValue(LocallyControlled, entity) ? 0xffffff : 0xff7070;
          gameObject.setTint(tint, tint, tint, tint);
        }
      });
    }
  });
}
