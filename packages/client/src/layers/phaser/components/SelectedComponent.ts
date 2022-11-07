import {EntityIndex, removeComponent, setComponent, World} from '@latticexyz/recs';
import {defineBoolComponent} from '@latticexyz/std-client';
import {getEntityWithComponentValue} from '../../../utils/entity';

export function defineSelectedComponent(world: World) {
  return defineBoolComponent(world, {id: 'Selected'});
}

type SelectedComponentType = ReturnType<typeof defineSelectedComponent>;

export function getSelectedEntity(selectedComponent: SelectedComponentType) {
  return getEntityWithComponentValue(selectedComponent);
}

export function selectEntity(
  selectedComponent: SelectedComponentType,
  entityIndex: EntityIndex
) {
  deselectEntity(selectedComponent);
  setComponent(selectedComponent, entityIndex, {value: true});
}

export function deselectEntity(selectedComponent: SelectedComponentType) {
  const selectedEntity = getSelectedEntity(selectedComponent);
  if (selectedEntity) {
    removeComponent(selectedComponent, selectedEntity);
  }
}
