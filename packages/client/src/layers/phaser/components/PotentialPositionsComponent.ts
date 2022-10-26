import {defineComponent, Type, World} from '@latticexyz/recs';

export function definePotentialPositionsComponent(world: World) {
  return defineComponent(
    world,
    {
      xValues: Type.NumberArray,
      yValues: Type.NumberArray,
    },
    {
      id: 'PotentialPositions',
    }
  );
}