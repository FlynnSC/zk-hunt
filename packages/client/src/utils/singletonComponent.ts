import {
  Component,
  ComponentValue,
  getComponentValue,
  getComponentValueStrict,
  hasComponent,
  Schema,
  setComponent,
  updateComponent
} from '@latticexyz/recs';
import {getGodIndexStrict} from './entity';

export function getSingletonComponentValue<S extends Schema>(component: Component<S>) {
  return getComponentValue(component, getGodIndexStrict(component.world));
}

export function getSingletonComponentValueStrict<S extends Schema>(component: Component<S>) {
  return getComponentValueStrict(component, getGodIndexStrict(component.world));
}

export function setSingletonComponent<S extends Schema>(
  component: Component<S>, value: ComponentValue<S>
) {
  setComponent(component, getGodIndexStrict(component.world), value);
}

export function updateSingletonComponent<S extends Schema>(
  component: Component<S>, value: Partial<ComponentValue<S>>
) {
  updateComponent(component, getGodIndexStrict(component.world), value);
}

export function hasSingletonComponent<S extends Schema>(component: Component<S>) {
  return hasComponent(component, getGodIndexStrict(component.world));
}
