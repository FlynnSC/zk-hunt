import {EntityIndex, Has, removeComponent, runQuery, setComponent, World} from '@latticexyz/recs';
import {defineBoolComponent} from '@latticexyz/std-client';
import {getIndexFromSet} from '../../../utils/misc';

export function defineSelectedComponent(world: World) {
  return defineBoolComponent(world, {id: 'Selected'});
}

type SelectedComponentType = ReturnType<typeof defineSelectedComponent>;

export function getSelectedEntity(selectedComponent: SelectedComponentType) {
  return getIndexFromSet(runQuery([Has(selectedComponent)]), 0);
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
