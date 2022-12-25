import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {
  ComponentValue,
  defineComponentSystem,
  EntityIndex,
  getComponentValue,
  getComponentValueStrict,
  Has,
  hasComponent,
  HasValue,
  removeComponent,
  runQuery,
  setComponent,
  Type,
  updateComponent
} from '@latticexyz/recs';
import {getIndexFromSet, lastElementOf, normalizedDiff} from '../../../utils/misc';
import {getEntityWithComponentValue} from '../../../utils/entity';
import {getMapTileMerkleData, getMapTileValue} from '../../../utils/mapData';
import {TileType} from '../../../constants';
import {setPersistedComponent} from '../../../utils/persistedComponent';
import {jungleMoveProver, positionCommitmentProver} from '../../../utils/zkProving';
import {drawTileSprite} from '../../../utils/drawing';
import {Sprites} from '../constants';
import {angleTowardPosition, coordsEq} from '../../../utils/coords';
import {Coord} from '@latticexyz/utils';
import {getRandomNonce} from '../../../utils/random';
import {getSingletonComponentValue} from '../../../utils/singletonComponent';

export function createMovePathSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    components: {Dead},
    api: {plainsMove, jungleEnter, jungleMove, jungleExit, loot, jungleLoot}
  } = network;

  const {
    scenes: {Main},
    components: {
      CursorTilePosition, PotentialMovePath, MovePath, PendingMovePosition, ParsedMapData,
      LocalPosition, Nonce, ActionSourcePosition, PrimingMove, LocallyControlled
    }
  } = phaser;

  const {input, objectPool} = Main;

  // TODO make it so that automatic move submission is paused if there are any active challenges
  // upon the unit

  const updatePotentialMovePath = (entity: EntityIndex, swapTraverseXFirst = false) => {
    const cursorPosition = getSingletonComponentValue(CursorTilePosition);
    if (!cursorPosition) return;

    // '!=' acts as XOR to flip value if swapTraverseXFirst is true
    const oldPotentialMovePath = getComponentValue(PotentialMovePath, entity);
    const traverseXFirst = oldPotentialMovePath?.traverseXFirst != swapTraverseXFirst;
    const continueFromPath = !!oldPotentialMovePath?.continueFromPath;
    const currMovePath = getComponentValue(MovePath, entity);
    const xValues = [] as number[];
    const yValues = [] as number[];
    const axisKeys: ('x' | 'y')[] = traverseXFirst ? ['x', 'y'] : ['y', 'x'];
    const prevPathPosition = continueFromPath && currMovePath?.xValues?.length ? {
      x: lastElementOf(currMovePath?.xValues as number[]),
      y: lastElementOf(currMovePath?.yValues as number[])
    } : {...getComponentValueStrict(ActionSourcePosition, entity)};
    axisKeys.forEach(axisKey => {
      const dir = normalizedDiff(prevPathPosition[axisKey], cursorPosition[axisKey]);
      while (prevPathPosition[axisKey] !== cursorPosition[axisKey]) {
        prevPathPosition[axisKey] += dir;
        xValues.push(prevPathPosition.x);
        yValues.push(prevPathPosition.y);
      }
    });
    setComponent(PotentialMovePath, entity, {
      xValues, yValues, traverseXFirst, continueFromPath
    });
  };

  // Update potential move path when cursor moves
  defineComponentSystem(world, CursorTilePosition, () => {
    const entity = getEntityWithComponentValue(PrimingMove);
    if (entity !== undefined) {
      updatePotentialMovePath(entity);
    }
  });

  // Updates the potential move path when PrimingMove changes
  defineComponentSystem(world, PrimingMove, ({entity, value}) => {
    if (value[0]) {
      updatePotentialMovePath(entity);
    } else {
      removeComponent(PotentialMovePath, entity);
    }
  });

  // Updates traverseXFirst for the potential move path when pressing R
  input.onKeyPress(keys => keys.has('R'), () => {
    const entity = getEntityWithComponentValue(PrimingMove);
    if (entity !== undefined) {
      updatePotentialMovePath(entity, true);
    }
  });

  // Updates the potential move path when the ActionSourcePosition changes
  defineComponentSystem(world, ActionSourcePosition, ({entity}) => {
    if (getComponentValue(PrimingMove, entity)) {
      updatePotentialMovePath(entity);
    }
  });

  // Handles confirmation of the potential path
  input.click$.subscribe(() => {
    const entity = getEntityWithComponentValue(PrimingMove);
    if (entity !== undefined) {
      const currPath = getComponentValue(MovePath, entity);
      const newPathSegment = getComponentValueStrict(PotentialMovePath, entity);

      if (newPathSegment.xValues.length > 0) {
        let xValues: number[];
        let yValues: number[];

        // Either continues from the current move path, or overwrites it
        if (newPathSegment.continueFromPath) {
          xValues = [...(currPath?.xValues as number[]), ...newPathSegment.xValues];
          yValues = [...(currPath?.yValues as number[]), ...newPathSegment.yValues];

          // Self-intersection path reduction
          const positionIndices = new Map<string, number>();
          let largestDuplicateIndex: number | undefined;
          for (let index = 0; index < xValues.length; ++index) {
            const id = JSON.stringify([xValues[index], yValues[index]]);
            if (positionIndices.has(id)) {
              largestDuplicateIndex = index;
            } else {
              positionIndices.set(id, index);
            }
          }

          // If there is a self intersection of the new path, remove the redundant portion between
          // the intersection elements
          if (largestDuplicateIndex !== undefined) {
            const firstIndex = positionIndices.get(
              JSON.stringify([xValues[largestDuplicateIndex], yValues[largestDuplicateIndex]])
            ) as number;
            xValues.splice(firstIndex, largestDuplicateIndex - firstIndex);
            yValues.splice(firstIndex, largestDuplicateIndex - firstIndex);
          }
        } else {
          // Includes the pending move position in the resulting path when creating a new path while
          // an old one already exists, otherwise a gap is created
          const pendingMovePosition = getComponentValue(PendingMovePosition, entity);
          if (pendingMovePosition) {
            xValues = [pendingMovePosition.x, ...newPathSegment.xValues];
            yValues = [pendingMovePosition.y, ...newPathSegment.yValues];
          } else {
            xValues = newPathSegment.xValues;
            yValues = newPathSegment.yValues;
          }
        }

        setComponent(MovePath, entity, {xValues, yValues});
        updateComponent(
          PotentialMovePath, entity, {xValues: [], yValues: [], continueFromPath: true}
        );
      }
    }
  });

  const getPositionsComponentElement = (
    value: ComponentValue<{xValues: Type.NumberArray, yValues: Type.NumberArray}>, index: number
  ) => ({x: value.xValues[index], y: value.yValues[index]});

  const getPathSpriteAndRotation = (position: Coord, prevPosition: Coord, nextPosition: Coord) => {
    if (prevPosition.x === nextPosition.x) {
      return {sprite: Sprites.MovePathStraight, rotation: 90};
    } else if (prevPosition.y === nextPosition.y) {
      return {sprite: Sprites.MovePathStraight, rotation: 0};
    } else {
      // Yeah, this logic is kinda wack, but it works so whatever
      let angleToPrev = angleTowardPosition(position, prevPosition);
      let angleToNext = angleTowardPosition(position, nextPosition);
      if (angleToPrev === 0 && angleToNext === 270) angleToPrev += 360;
      if (angleToNext === 0 && angleToPrev === 270) angleToNext += 360;

      let rotation = -angleToNext;
      if (angleToPrev > angleToNext) rotation -= 90;
      return {sprite: Sprites.MovePathCorner, rotation};
    }
  };

  type PathType = ComponentValue<{xValues: Type.NumberArray, yValues: Type.NumberArray}> | undefined;

  const drawPath = (
    entity: EntityIndex, id: string, currPath: PathType, prevPath: PathType, potential: boolean,
    continueFromPath?: boolean
  ) => {
    // Removes the prev path if it exists
    if (prevPath) {
      prevPath.xValues.forEach((x, index) => {
        objectPool.remove(`${id}-${entity}-${index}`);
      });
    }

    if (currPath) {
      currPath.xValues.forEach((x, index, arr) => {
        // If this is the first element in the path, then the prev element is either the action
        // source position or the last element in the move path, based on the value of
        // continueFromPath
        const position = {x, y: currPath.yValues[index]};
        let prevPosition: Coord;
        if (index === 0) {
          if (continueFromPath) {
            const movePath = getComponentValueStrict(MovePath, entity);
            prevPosition = getPositionsComponentElement(movePath, movePath.xValues.length - 1);
          } else {
            prevPosition = getComponentValueStrict(ActionSourcePosition, entity);
          }
        } else {
          prevPosition = getPositionsComponentElement(currPath, index - 1);
        }

        let sprite: Sprites;
        let rotation;
        if (index === arr.length - 1) {
          sprite = Sprites.MovePathEnd;
          rotation = -angleTowardPosition(prevPosition, position);
        } else {
          const nextPosition = getPositionsComponentElement(currPath, index + 1);
          const data = getPathSpriteAndRotation(position, prevPosition, nextPosition);
          sprite = data.sprite;
          rotation = data.rotation;
        }

        const alpha = potential ? 0.4 : 0.7;
        drawTileSprite(Main, `${id}-${entity}-${index}`, position, sprite, {alpha, rotation});
      });
    }

    // Handles rendering of potential path connection to move path (if needed)
    if (potential) {
      objectPool.remove('PotentialMovePathConnector');
      const movePath = getComponentValue(MovePath, entity);
      if (currPath && movePath) {
        let position: Coord;
        let prevPosition: Coord;
        if (continueFromPath) {
          position = getPositionsComponentElement(movePath, movePath.xValues.length - 1);
          if (movePath.xValues.length > 1) {
            prevPosition = getPositionsComponentElement(movePath, movePath.xValues.length - 2);
          } else {
            prevPosition = getComponentValueStrict(LocalPosition, entity);
          }
        } else {
          position = getComponentValueStrict(ActionSourcePosition, entity);
          prevPosition = getComponentValueStrict(LocalPosition, entity);
        }
        const nextPosition = getPositionsComponentElement(currPath, 0);

        // If the path backtracks, then don't draw the connector
        if (!coordsEq(prevPosition, nextPosition)) {
          const {sprite, rotation} = getPathSpriteAndRotation(position, prevPosition, nextPosition);
          drawTileSprite(
            Main, 'PotentialMovePathConnector', position, sprite, {alpha: 0.7, rotation}
          );
        }
      }
    }
  };

  // Handles drawing and removal of potential move path sprites
  defineComponentSystem(world, PotentialMovePath, ({entity, value}) => {
    const [currPath, prevPath] = value;
    drawPath(entity, 'PotentialMovePath', currPath, prevPath, true, currPath?.continueFromPath);
  });

  // Makes a move if possible
  const attemptMove = async (entityIndex: EntityIndex) => {
    const movePath = getComponentValue(MovePath, entityIndex);

    // Do not start a new move if there is already a pending move, or if reached the end of the
    // move path
    if (getComponentValue(PendingMovePosition, entityIndex) || !movePath) {
      return;
    }

    const oldPosition = getComponentValueStrict(LocalPosition, entityIndex);
    const newPosition = {x: movePath.xValues[0], y: movePath.yValues[0]};
    const oldTileType = getMapTileValue(ParsedMapData, oldPosition);
    const newTileType = getMapTileValue(ParsedMapData, newPosition);
    const entityID = world.entities[entityIndex];
    setComponent(PendingMovePosition, entityIndex, newPosition);

    if (oldTileType === TileType.PLAINS) {
      if (newTileType === TileType.PLAINS) {
        plainsMove(entityID, newPosition);
      } else {
        // New random nonce every time upon entering the jungle
        const nonce = getRandomNonce();
        setPersistedComponent(Nonce, entityIndex, {value: nonce});
        const {proofData, publicSignals} = await positionCommitmentProver({...newPosition, nonce});
        jungleEnter(entityID, newPosition, publicSignals[0], proofData);
      }
    } else if (newTileType === TileType.PLAINS) {
      const nonce = getComponentValueStrict(Nonce, entityIndex).value;
      jungleExit(entityID, oldPosition, nonce, newPosition);
    } else {
      const nonce = getComponentValueStrict(Nonce, entityIndex).value;
      const {proofData, publicSignals} = await jungleMoveProver({
        oldX: oldPosition.x, oldY: oldPosition.y, oldNonce: nonce,
        newX: newPosition.x, newY: newPosition.y,
        ...getMapTileMerkleData(ParsedMapData, newPosition)
      });
      jungleMove(entityID, publicSignals[1], proofData);
      setPersistedComponent(Nonce, entityIndex, {value: nonce + 1});
    }

    // Picks up any loot in the new position
    const entities = runQuery([Has(Dead), HasValue(LocalPosition, newPosition)]);
    const entityToLoot = entities.size > 0 ? getIndexFromSet(entities, 0) : undefined;
    if (entityToLoot !== undefined) {
      const entityToLootID = world.entities[entityToLoot];
      if (oldTileType === TileType.JUNGLE && newTileType === TileType.JUNGLE) {
        const nonce = getComponentValueStrict(Nonce, entityIndex).value;
        const {proofData} = await positionCommitmentProver({...newPosition, nonce});
        jungleLoot(entityID, entityToLootID, newPosition, proofData);
      } else {
        loot(entityID, entityToLootID);
      }
    }
  };

  // Handles attempting moves if the path changes, and drawing and removal of move path sprites
  defineComponentSystem(world, MovePath, ({entity, value}) => {
    const [currPath, prevPath] = value;
    drawPath(entity, 'MovePath', currPath, prevPath, false);
    attemptMove(entity);
  });

  // Updates the action source position when the pending move position changes, as well as rendering
  // a sprite to show the pending position
  defineComponentSystem(world, PendingMovePosition, ({entity, value}) => {
    const pendingMovePosition = value[0];
    if (pendingMovePosition) {
      setComponent(ActionSourcePosition, entity, pendingMovePosition);
      drawTileSprite(
        Main, `PendingMovePosition-${entity}`, pendingMovePosition, Sprites.Donkey, {alpha: 0.4}
      );
    } else {
      objectPool.remove(`PendingMovePosition-${entity}`);
    }
  });

  // Handles updating the movePath and submitting the next move when a move transaction is confirmed
  // (indirectly, updating movePath handles submission in its system), and updates the action source
  // position
  defineComponentSystem(world, LocalPosition, ({entity, value}) => {
    // Do nothing if the position was removed or hasn't changed
    if (!value[0] || coordsEq(value[0], value[1])) return;

    if (hasComponent(PendingMovePosition, entity)) {
      removeComponent(PendingMovePosition, entity);
    }
    if (hasComponent(LocallyControlled, entity)) {
      setComponent(ActionSourcePosition, entity, value[0] as Coord);
    }

    const movePath = getComponentValue(MovePath, entity);
    if (movePath) {
      // Updating the move path also submits the next move if possible
      if (movePath.xValues.length > 1) {
        setComponent(MovePath, entity, {
          xValues: movePath.xValues.slice(1),
          yValues: movePath.yValues.slice(1)
        });
      } else {
        removeComponent(MovePath, entity);
        const potentialMovePath = getComponentValue(PotentialMovePath, entity);
        if (potentialMovePath) {
          // Ensures the potential move path is correctly re-rendered
          updateComponent(PotentialMovePath, entity, {continueFromPath: false});
        }
      }
    }
  });
}
