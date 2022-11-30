import {defineComponent, Type, World} from '@latticexyz/recs';

export function defineNullifierQueueComponent(world: World) {
  return defineComponent(
    world,
    {
      queue: Type.StringArray,
      headIndex: Type.Number,
    },
    {
      id: 'NullifierQueue',
      metadata: {
        contractId: 'zkhunt.component.NullifierQueue',
      },
    }
  );
}
