import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {
  defineComponentSystem,
  EntityIndex,
  getComponentValue,
  getComponentValueStrict,
  Has,
  hasComponent,
  removeComponent,
  runQuery,
  setComponent
} from '@latticexyz/recs';
import {TileType} from '../../../constants';
import {getMapTileValue, getParsedMapDataFromComponent} from '../../../utils/mapData';
import {Coord} from '@latticexyz/utils';
import {Tileset} from '../assets/tilesets/overworldTileset';
import {setPersistedComponent} from '../../../utils/persistedComponent';
import {indexToPosition, positionToIndex} from '../../../utils/coords';

export function createJungleMovementSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    components: {Position, MapData, JungleMoveCount, RevealedPotentialPositions},
  } = network;

  const {
    scenes: {Main: {maps: {MainMap}}},
    components: {LocalPosition, MovePath, PotentialPositions, LocallyControlled},
  } = phaser;

  const updatePotentialPositions = (entity: EntityIndex, moveCount: number) => {
    // Uses the revealed potential positions if there are any
    let potentialPositions: Coord[];
    if (hasComponent(RevealedPotentialPositions, entity)) {
      const revealedPotentialPositions
        = getComponentValueStrict(RevealedPotentialPositions, entity);
      potentialPositions = revealedPotentialPositions.xValues.map((x, index) => (
        {x, y: revealedPotentialPositions.yValues[index]}
      ));
    } else {
      potentialPositions = [getComponentValueStrict(Position, entity)];
    }
    let currEdgePositions = [...potentialPositions];
    let newEdgePositions: Coord[] = [];
    const seenPositionIndices = new Set(potentialPositions.map(positionToIndex));
    const parsedMapData = getParsedMapDataFromComponent(MapData);
    const checkOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    // This algorithm assumes that the hiding state of tiles do not change over time
    for (let step = 1; step < moveCount; ++step) {
      currEdgePositions.forEach(currPosition => {
        checkOffsets.map(
          ([offsetX, offsetY]) => ({x: currPosition.x + offsetX, y: currPosition.y + offsetY})
        ).forEach(newPosition => {
          const positionIndex = positionToIndex(newPosition);
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

    setComponent(PotentialPositions, entity, potentialPositions.reduce((obj, position) => {
      obj.xValues.push(position.x);
      obj.yValues.push(position.y);
      return obj;
    }, {xValues: [] as number[], yValues: [] as number[]}));
  };

  // When there is a change in the jungle move count, updates the local position for the local
  // player, and updates the potential player positions for external players. Also removes the
  // potential player positions display when a player exits the jungle
  defineComponentSystem(world, JungleMoveCount, ({entity, value}) => {
    const moveCount = value[0]?.value ?? 0;

    // If the entity is owned by the local player, update its local position
    if (getComponentValue(LocallyControlled, entity)?.value) {
      const movePath = getComponentValue(MovePath, entity);
      // Only update the local position in response to jungle -> jungle movement (moveCount > 1)
      if (moveCount > 1 && movePath) {
        setPersistedComponent(
          LocalPosition, entity, {x: movePath.xValues[0], y: movePath.yValues[0]}
        );
      }
    }

    // Remove potential player positions when exiting the jungle
    if (moveCount === 0) {
      removeComponent(PotentialPositions, entity);
    } else {
      updatePotentialPositions(entity, moveCount);
    }
  });

  // Updates the potential positions for an entity when there is a potential positions reveal
  // The updatePotentialPositions() here may seem redundant, because it's also called in the
  // JungleMoveCount defineComponentSystem() above, but mud doesn't guarantee the order in which
  // these systems are called, and the latest RevealedPotentialPositions value needs to be present
  // in order to update the PotentialPositions correctly
  defineComponentSystem(world, RevealedPotentialPositions, ({entity, value}) => {
    if (value[0]) {
      updatePotentialPositions(entity, getComponentValueStrict(JungleMoveCount, entity).value);
    }
  });

  // Updates the total potential positions overlay
  defineComponentSystem(world, PotentialPositions, ({entity, value}) => {
    // Don't render the overlay for locally controlled entities
    if (getComponentValue(LocallyControlled, entity)) return;

    // Ensures that if there are fewer potential positions than the last render, the removed ones
    // are cleared
    const oldPotentialPositions = value[1];
    if (oldPotentialPositions) {
      oldPotentialPositions.xValues.forEach((x, index) => {
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
        const positionIndex = positionToIndex({x, y: potentialPositions.yValues[index]});
        const previousCount = tileCounts.get(positionIndex) || 0;
        tileCounts.set(positionIndex, previousCount + 1);
      });
    });

    // Redraws the full set of potential player position indicator tiles
    tileCounts.forEach((count, positionIndex) => {
      MainMap.putTileAt(indexToPosition(positionIndex), Tileset.Unknown1 + count - 1, 'Overlay');
    });
  });
}
