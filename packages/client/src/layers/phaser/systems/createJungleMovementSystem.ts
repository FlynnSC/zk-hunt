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
import {getParsedMapData, isMapTileJungle} from '../../../utils/mapData';
import {Coord} from '@latticexyz/utils';
import {Tileset} from '../assets/tilesets/overworldTileset';
import {setPersistedComponent} from '../../../utils/persistedComponent';
import {indexToPosition, positionToIndex} from '../../../utils/coords';

export function createJungleMovementSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    components: {MapData, JungleMoveCount, RevealedPotentialPositions},
  } = network;

  const {
    scenes: {Main: {maps: {MainMap}}},
    components: {
      LocalPosition, MovePath, PotentialPositions, LocallyControlled, LocalJungleMoveCount,
      LastKnownPositions
    },
  } = phaser;

  const updatePotentialPositions = (entity: EntityIndex) => {
    const lastKnownPositions = getComponentValueStrict(LastKnownPositions, entity);
    const potentialPositions = lastKnownPositions.xValues.map((x, index) => (
      {x, y: lastKnownPositions.yValues[index]}
    ));
    let currEdgePositions = [...potentialPositions];
    let newEdgePositions: Coord[] = [];
    const seenPositionIndices = new Set(currEdgePositions.map(positionToIndex));
    const parsedMapData = getParsedMapData(MapData);
    const checkOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const moveCount = getComponentValue(LocalJungleMoveCount, entity)?.value ?? 0;

    // This algorithm assumes that the hiding state of tiles do not change over time
    for (let step = 1; step < moveCount; ++step) {
      currEdgePositions.forEach(currPosition => {
        checkOffsets.map(
          ([offsetX, offsetY]) => ({x: currPosition.x + offsetX, y: currPosition.y + offsetY})
        ).forEach(newPosition => {
          const positionIndex = positionToIndex(newPosition);
          if (!seenPositionIndices.has(positionIndex) && isMapTileJungle(parsedMapData, newPosition)) {
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

  // Updates the LocalJungleMoveCount when the JungleMoveCount changes
  defineComponentSystem(world, JungleMoveCount, ({entity, value}) => {
    const newJungleMoveCount = Number(value[0]?.value ?? 0);
    if (newJungleMoveCount > 0) {
      // Increments the local jungle move count (if it is defined) such that if the local value is
      // lower than the contract value due to private info reveal, then that information is
      // preserved, but if the contract jungle move count is lower than the local value then the
      // contract value is used instead
      const oldJungleMoveCount = getComponentValue(LocalJungleMoveCount, entity)?.value ?? Infinity;
      setComponent(LocalJungleMoveCount, entity, {
        value: Math.min(oldJungleMoveCount + 1, newJungleMoveCount)
      });
    } else {
      removeComponent(LocalJungleMoveCount, entity);
    }
  });

  // When there is a change in the local jungle move count, updates the local position for the local
  // player, and updates the potential player positions for external players. Also removes the
  // potential player positions display when a player exits the jungle
  defineComponentSystem(world, LocalJungleMoveCount, ({entity, value}) => {
    // Treats being outside the jungle as having a jungle move count of 0
    const moveCount = value[0]?.value ?? 0;

    // If the entity is owned by the local player, update its local position
    if (hasComponent(LocallyControlled, entity)) {
      const movePath = getComponentValue(MovePath, entity);
      // Only update the local position in response to jungle -> jungle movement (moveCount > 1), as
      // updating the position when entering or exiting the jungle is handled by other systems
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
      updatePotentialPositions(entity);

      // Removes non-locally controlled entities' local position after the second jungle move, so
      // that their sprite disappears
      const isLocallyControlled = hasComponent(LocallyControlled, entity);
      if (!isLocallyControlled && hasComponent(LocalPosition, entity) && moveCount > 1) {
        removeComponent(LocalPosition, entity);
      }
    }
  });

  // Updates the last know positions for the entity if it reveals potential positions
  defineComponentSystem(world, RevealedPotentialPositions, ({entity, value}) => {
    if (value[0]) {
      setComponent(LastKnownPositions, entity, value[0]);
    }
  });

  // Updates the potential positions if the last known positions change (private position reveal, or
  // public potential positions reveal)
  defineComponentSystem(world, LastKnownPositions, ({entity, value}) => {
    if (value[0]) {
      updatePotentialPositions(entity);
    }
  });

  // Updates the total potential positions overlay
  defineComponentSystem(world, PotentialPositions, ({entity, value}) => {
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

      // Only displays potential positions indicator for non-locally controlled entities with more
      // than one potential positions
      if (!hasComponent(LocallyControlled, entity) && potentialPositions.xValues.length > 1) {
        potentialPositions.xValues.forEach((x, index) => {
          const positionIndex = positionToIndex({x, y: potentialPositions.yValues[index]});
          const previousCount = tileCounts.get(positionIndex) || 0;
          tileCounts.set(positionIndex, previousCount + 1);
        });
      }
    });

    // Redraws the full set of potential player position indicator tiles
    tileCounts.forEach((count, positionIndex) => {
      MainMap.putTileAt(indexToPosition(positionIndex), Tileset.Unknown1 + count - 1, 'Overlay');
    });
  });
}
