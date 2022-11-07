import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {Key, pixelCoordToTileCoord} from '@latticexyz/phaserx';
import {
  Component,
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
  Type
} from '@latticexyz/recs';
import {TILE_HEIGHT, TILE_WIDTH} from '../constants';
import {coordsEq, isPositionWithinMapBounds} from '../../../utils/coords';
import {deselectEntity, getSelectedEntity, selectEntity} from '../components/SelectedComponent';
import {getIndexFromSet} from '../../../utils/misc';
import {getGodIndex, getGodIndexStrict} from '../../../utils/entity';
import {drawRect} from '../../../utils/drawing';

export function createEntitySelectionSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    scenes: {Main: {input, objectPool}},
    world,
    components: {
      LocalPosition, LocallyControlled, Selected, CursorTilePosition, PrimingMove, PrimingAttack
    }
  } = phaser;

  // Updates the stored cursor (tile) position
  input.pointermove$.subscribe(e => {
    const godIndex = getGodIndex(world);
    if (godIndex !== undefined) {
      const oldCursorPosition = getComponentValue(CursorTilePosition, godIndex);
      const newCursorPosition = pixelCoordToTileCoord(
        {x: e.pointer.worldX, y: e.pointer.worldY}, TILE_WIDTH, TILE_HEIGHT
      );
      if (
        isPositionWithinMapBounds(newCursorPosition) &&
        !coordsEq(newCursorPosition, oldCursorPosition)
      ) {
        setComponent(CursorTilePosition, godIndex, newCursorPosition);
      }
    }
  });

  // Draws the cursor rect
  defineComponentSystem(world, CursorTilePosition, ({value}) => {
    const newCursorPosition = value[0];
    if (newCursorPosition) {
      drawRect(objectPool, 'CursorRect', newCursorPosition, 0x0000ff);
    }
  });

  // Handles entity selection with left click
  input.click$.subscribe(() => {
    const cursorPosition = getComponentValue(CursorTilePosition, getGodIndexStrict(world));
    if (cursorPosition) {
      const clickedEntities = runQuery(
        [Has(LocallyControlled), HasValue(LocalPosition, cursorPosition)]
      );

      if (clickedEntities.size > 0) {
        const entityIndex = Array.from(clickedEntities.values())[0];
        selectEntity(Selected, entityIndex);
      }
    }
  });

  // Handles entity deselection with right click
  input.rightClick$.subscribe(() => {
    deselectEntity(Selected);
  });

  // Handles entity selection with the num keys
  input.keyboard$.subscribe(e => {
    // Num keys 1 - 3
    if (e.isDown && e.keyCode >= 49 && e.keyCode <= 51) {
      const selectionIndex = e.keyCode - 49;
      const locallyControlledEntities = runQuery([Has(LocallyControlled)]);
      if (selectionIndex < locallyControlledEntities.size) {
        selectEntity(Selected, getIndexFromSet(locallyControlledEntities, selectionIndex));
      } else {
        deselectEntity(Selected);
      }
    }
  });

  const drawSelectedEntityRect = (entity: EntityIndex) => {
    const entityPosition = getComponentValueStrict(LocalPosition, entity);
    drawRect(objectPool, `SelectedEntityRect-${entity}`, entityPosition, 0x0088ff);
  };

  // Handles rendering and removal of the selected entity rect
  defineComponentSystem(world, Selected, ({entity, value}) => {
    if (value[0]) {
      drawSelectedEntityRect(entity);
    } else {
      objectPool.remove(`SelectedEntityRect-${entity}`);
    }
  });

  // Handles updating the position of the selected entity rect when the entity moves
  defineComponentSystem(world, LocalPosition, ({entity}) => {
    if (hasComponent(Selected, entity)) {
      drawSelectedEntityRect(entity);
    }
  });

  const keyCodeToComponent: Record<string, Component<{value: Type.Boolean}>> = {
    69: PrimingMove, // E
    87: PrimingAttack, // W
  };


  // Handles updating the PrimingX components when the respective buttons are pressed/released
  input.keyboard$.subscribe(e => {
    const selectedEntity = getSelectedEntity(Selected);
    const component = keyCodeToComponent[e.keyCode];
    if (selectedEntity && component) {
      if (e.isDown) {
        // Only update the component on the initial press (not repeatedly when held down)
        if (e.repeats === 1) {
          setComponent(component, selectedEntity, {value: true});
        }
      } else {
        removeComponent(component, selectedEntity);
      }
    }
  });

  const keyCodeToKey: Record<string, string> = {
    69: 'E',
    87: 'W',
  };

  // Handles updating the PrimingX components when the selected entity changes
  defineComponentSystem(world, Selected, ({entity, value}) => {
    if (value[0]) {
      // If keys are held down when switching different entities, set the relevant components
      Object.entries(keyCodeToComponent).forEach(([keyCode, component]) => {
        if (input.pressedKeys.has(keyCodeToKey[keyCode] as Key)) {
          setComponent(component, entity, {value: true});
        }
      });
    } else {
      Object.values(keyCodeToComponent).forEach(component => removeComponent(component, entity));
    }
  });
}
