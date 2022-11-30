import {defineComponent, Type, World} from '@latticexyz/recs';

export function defineChallengeTilesComponent(world: World) {
  return defineComponent(
    world,
    {
      xValues: Type.NumberArray,
      yValues: Type.NumberArray,
      merkleChainRoot: Type.String,
      challenger: Type.String
    },
    {
      id: 'ChallengeTiles',
      metadata: {
        contractId: 'zkhunt.component.ChallengeTiles',
      },
    }
  );
}
