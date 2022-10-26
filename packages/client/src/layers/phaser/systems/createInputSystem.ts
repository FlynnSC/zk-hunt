import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {pixelCoordToTileCoord} from '@latticexyz/phaserx';
import {EntityIndex, getComponentValueStrict, Has, runQuery, setComponent} from '@latticexyz/recs';
import {getMapTileMerkleData, getMapTileValue, getParsedMapDataFromComponent} from '../../../utils/mapData';
import {Direction, TileType} from '../../../constants';
import {jungleEnterProver, jungleMoveProver} from '../../../utils/zkProving';
import {Coord} from '@latticexyz/utils';
import {setPersistedComponent} from '../../../utils/persistedComponent';
import {getRandomNonce} from '../../../utils/random';
import {TILE_HEIGHT, TILE_WIDTH} from '../constants';
import {subtractCoords} from '../../../utils/coords';

export function createInputSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    scenes: {Main: {input}},
    world,
    components: {LocalPosition, TargetPosition, Nonce, LocallyControlled}
  } = phaser;

  const {
    api: {spawn, plainsMove, jungleEnter, jungleMove, jungleExit, createHit},
    network: {connectedAddress},
    components: {MapData},
  } = network;

  const handleMove = async (entityIndex: EntityIndex, newPosition: Coord) => {
    const entity = world.entities[entityIndex];
    setComponent(TargetPosition, entityIndex, newPosition);

    const oldPosition = getComponentValueStrict(LocalPosition, entityIndex);
    const parsedMapData = getParsedMapDataFromComponent(MapData);
    const oldTileType = getMapTileValue(parsedMapData, oldPosition);
    const newTileType = getMapTileValue(parsedMapData, newPosition);

    if (oldTileType === TileType.PLAINS) {
      if (newTileType === TileType.PLAINS) {
        plainsMove(entity, newPosition);
      } else {
        // New random nonce every time upon entering the jungle
        const nonce = getRandomNonce();
        setPersistedComponent(Nonce, entityIndex, {value: nonce});
        const {proofData, publicSignals} = await jungleEnterProver({...newPosition, nonce});
        jungleEnter(entity, newPosition, publicSignals[0], proofData);
      }
    } else if (newTileType === TileType.PLAINS) {
      const nonce = getComponentValueStrict(Nonce, entityIndex).value;
      jungleExit(entity, oldPosition, nonce, newPosition);
    } else {
      const nonce = getComponentValueStrict(Nonce, entityIndex).value;
      const {proofData, publicSignals} = await jungleMoveProver({
        oldX: oldPosition.x, oldY: oldPosition.y, oldNonce: nonce,
        newX: newPosition.x, newY: newPosition.y,
        ...getMapTileMerkleData(parsedMapData, newPosition),
      });
      jungleMove(entity, publicSignals[1], proofData);
      setPersistedComponent(Nonce, entityIndex, {value: nonce + 1});
    }
  };

  input.click$.subscribe(e => {
    const controlledEntities = runQuery([Has(LocallyControlled)]);
    if (controlledEntities.size > 0) {
      const entityIndex = Array.from(controlledEntities.values())[0];
      const newPosition = pixelCoordToTileCoord({x: e.worldX, y: e.worldY}, TILE_WIDTH, TILE_HEIGHT);
      handleMove(entityIndex, newPosition);
    } else {
      spawn(connectedAddress.get()!);
    }
  });

  const offsetToDirection = {
    [JSON.stringify({x: 1, y: 0})]: Direction.RIGHT,
    [JSON.stringify({x: 0, y: -1})]: Direction.UP,
    [JSON.stringify({x: -1, y: 0})]: Direction.LEFT,
    [JSON.stringify({x: 0, y: 1})]: Direction.DOWN,
  };

  input.rightClick$.subscribe(e => {
    const controlledEntities = runQuery([Has(LocallyControlled)]);
    if (controlledEntities.size > 0) {
      const entityIndex = Array.from(controlledEntities.values())[0];
      const entityPosition = getComponentValueStrict(LocalPosition, entityIndex);
      const clickPosition = pixelCoordToTileCoord(
        {x: e.worldX, y: e.worldY}, TILE_WIDTH, TILE_HEIGHT
      );
      const direction = offsetToDirection[
        JSON.stringify(subtractCoords(clickPosition, entityPosition))
        ];
      if (direction !== undefined) {
        createHit(world.entities[entityIndex], direction);
      }
    }
  });
}
