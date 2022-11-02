import {Component, EntityIndex, getComponentValue, removeComponent, setComponent, World} from '@latticexyz/recs';
import {defineNumberComponent} from '@latticexyz/std-client';
import {getGodIndexStrict} from '../../../utils/entity';

export function defineSelectedEntityComponent(world: World) {
  return defineNumberComponent(world, {id: 'SelectedEntity'});
}

export function getSelectedEntity(selectedEntityComponent: Component<{value: number}>) {
  return getComponentValue(
    selectedEntityComponent,
    getGodIndexStrict(selectedEntityComponent.world)
  )?.value as EntityIndex | undefined;
}

export function selectEntity(
  selectedEntityComponent: Component<{value: number}>,
  entityIndex: EntityIndex
) {
  setComponent(
    selectedEntityComponent,
    getGodIndexStrict(selectedEntityComponent.world),
    {value: entityIndex}
  );
}

export function deselectEntity(selectedEntityComponent: Component<{value: number}>) {
  removeComponent(selectedEntityComponent, getGodIndexStrict(selectedEntityComponent.world));
}
