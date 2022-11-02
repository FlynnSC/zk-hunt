import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {
  defineComponentSystem,
  getComponentValue,
  getComponentValueStrict,
  Has,
  removeComponent,
  runQuery,
  setComponent
} from '@latticexyz/recs';
import {MAP_SIZE, TileType} from '../../../constants';
import {getMapTileValue, getParsedMapDataFromComponent} from '../../../utils/mapData';
import {Coord} from '@latticexyz/utils';
import {Tileset} from '../assets/tilesets/overworldTileset';
import {setPersistedComponent} from '../../../utils/persistedComponent';
import {calcPositionIndex} from '../../../utils/coords';

export function createJungleMovementSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    components: {Position, MapData, JungleMoveCount},
  } = network;

  const {
    scenes: {Main: {maps: {MainMap}}},
    components: {LocalPosition, MovePath, PotentialPositions, LocallyControlled},
  } = phaser;

  // When there is a change in the jungle move count, updates the local position for the local
  // player, and updates the potential player positions for external players. Also removes the
  // potential player positions display when a player exits the jungle
  defineComponentSystem(world, JungleMoveCount, ({entity, value}) => {
    const moveCount = Number(value[0]?.value);

    // If the entity is owned by the local player, update its local position, otherwise update the
    // potential positions
    if (getComponentValue(LocallyControlled, entity)?.value) {
      const movePath = getComponentValue(MovePath, entity);
      // Only update the local position in response to jungle -> jungle movement (moveCount > 1)
      if (moveCount > 1 && movePath) {
        setPersistedComponent(
          LocalPosition, entity, {x: movePath.xValues[0], y: movePath.yValues[0]}
        );
      }
    } else {
      // The commitment will be set to zero when exiting the jungle, so remove potential player
      // positions
      if (moveCount === 0) {
        removeComponent(PotentialPositions, entity);
      } else {
        // This algorithm assumes that the hiding state of tiles do not change
        const startingPosition = getComponentValueStrict(Position, entity);
        const potentialPositions = [startingPosition];
        let currEdgePositions = [startingPosition];
        let newEdgePositions: Coord[] = [];
        const seenPositionIndices = new Set([calcPositionIndex(startingPosition)]);
        const parsedMapData = getParsedMapDataFromComponent(MapData);
        const checkOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (let step = 1; step < moveCount; ++step) {
          currEdgePositions.forEach(currPosition => {
            checkOffsets.map(
              ([offsetX, offsetY]) => ({x: currPosition.x + offsetX, y: currPosition.y + offsetY})
            ).forEach(newPosition => {
              const positionIndex = calcPositionIndex(newPosition);
              if (
                !seenPositionIndices.has(positionIndex) &&
                getMapTileValue(parsedMapData, newPosition) === TileType.JUNGLE
              ) {
                potentialPositions.push(newPosition);
                newEdgePositions.push(newPosition);
                seenPositionIndices.add(positionIndex);
              }
            });
          });
          currEdgePositions = newEdgePositions;
          newEdgePositions = [];
        }

        const convertedPotentialPositions = potentialPositions.reduce((obj, position) => {
          obj.xValues.push(position.x);
          obj.yValues.push(position.y);
          return obj;
        }, {xValues: [] as number[], yValues: [] as number[]});
        setComponent(PotentialPositions, entity, convertedPotentialPositions);
      }
    }
  });

  // Updates the total potential positions overlay
  defineComponentSystem(world, PotentialPositions, ({value}) => {
    // Removes indicators when potential player positions are removed
    if (value[0] === undefined) {
      const oldPotentialPositions = value[1];
      oldPotentialPositions?.xValues?.forEach((x, index) => {
        const y = oldPotentialPositions.yValues[index];
        MainMap.putTileAt({x, y}, Tileset.Empty, 'Overlay');
      });
    }

    // Calculates the number of potential players in each tile (that could have a player in it)
    const tileCounts = new Map<number, number>();
    const hiddenEntities = runQuery([Has(PotentialPositions)]);
    hiddenEntities.forEach(entity => {
      const potentialPositions = getComponentValueStrict(PotentialPositions, entity);
      potentialPositions.xValues.forEach((x, index) => {
        const positionIndex = calcPositionIndex({x, y: potentialPositions.yValues[index]});
        const previousCount = tileCounts.get(positionIndex) || 0;
        tileCounts.set(positionIndex, previousCount + 1);
      });
    });

    // Redraws the full set of potential player position indicator tiles
    tileCounts.forEach((count, positionIndex) => {
      const position = {x: positionIndex % MAP_SIZE, y: Math.floor(positionIndex / MAP_SIZE)};
      MainMap.putTileAt(position, Tileset.Unknown1 + count - 1, 'Overlay');
    });
  });
}
