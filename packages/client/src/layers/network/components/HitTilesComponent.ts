import {defineComponent, Type, World} from '@latticexyz/recs';

export function defineHitTilesComponent(world: World) {
  return defineComponent(
    world,
    {
      xValues: Type.NumberArray,
      yValues: Type.NumberArray,
      merkleRoot: Type.String,
    },
    {
      id: 'HitTiles',
      metadata: {
        contractId: 'zkhunt.component.HitTiles',
      },
    }
  );
}
