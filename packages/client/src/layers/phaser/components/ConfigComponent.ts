import {defineComponent, Type, World} from '@latticexyz/recs';

export function defineConfigComponent(world: World) {
  return defineComponent(
    world,
    {
      ignoreHiddenChallenge: Type.Boolean,
    },
    {
      id: 'Config',
    }
  );
}
