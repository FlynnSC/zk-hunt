import {Component, ComponentValue} from '@latticexyz/recs';

export function getIndexFromSet<T>(set: Set<T>, index: number) {
  return Array.from(set.values())[index];
}

// From a to b
export function normalizedDiff(a: number, b: number) {
  return a < b ? 1 : (a > b ? -1 : 0);
}

export function lastElementOf<T>(arr: T[]) {
  return arr[arr.length - 1];
}

export type ComponentValueFromComponent<Comp> =
  Comp extends Component<infer S> ? ComponentValue<S> : never;
