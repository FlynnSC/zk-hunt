import {defineComponent, Metadata, Type, World} from '@latticexyz/recs';

export function defineStringArrayComponent<M extends Metadata>(
  world: World,
  options?: {id?: string; metadata?: M; indexed?: boolean}
) {
  return defineComponent(
    world,
    {
      value: Type.StringArray
    },
    options
  );
}

export function defineCoordArrayComponent<M extends Metadata>(
  world: World,
  options?: {id?: string; metadata?: M; indexed?: boolean}
) {
  return defineComponent(
    world,
    {
      xValues: Type.NumberArray,
      yValues: Type.NumberArray
    },
    options
  );
}

export function defineNumberArrayComponent<M extends Metadata>(
  world: World,
  options?: {id?: string; metadata?: M; indexed?: boolean}
) {
  return defineComponent(
    world,
    {
      value: Type.NumberArray
    },
    options
  );
}

export function defineEntityIndexComponent<M extends Metadata>(
  world: World,
  options?: {id?: string; metadata?: M; indexed?: boolean}
) {
  return defineComponent(
    world,
    {
      value: Type.Number
    },
    options
  );
}
