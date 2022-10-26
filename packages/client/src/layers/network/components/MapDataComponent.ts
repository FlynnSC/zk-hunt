import {defineComponent, Type, World} from '@latticexyz/recs';

export function defineMapDataComponent(world: World) {
  return defineComponent(
    world,
    {
      chunks: Type.StringArray,
      intermediaryNodes: Type.StringArray,
      root: Type.String,
    },
    {
      id: 'MapData',
      metadata: {
        contractId: 'zkhunt.component.MapData',
      },
    }
  );
}
