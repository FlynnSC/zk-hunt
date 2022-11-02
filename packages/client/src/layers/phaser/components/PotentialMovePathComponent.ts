import {defineComponent, Type, World} from '@latticexyz/recs';

export function definePotentialMovePathComponent(world: World) {
  return defineComponent(
    world,
    {
      xValues: Type.NumberArray,
      yValues: Type.NumberArray,
      // When forming an L to the cursor, whether to traverse the x or the y axis first
      traverseXFirst: Type.Boolean,
      // Whether to continue from the last position in the current path (if it exists), or start a
      // (potentially) new path from the player
      continueFromPath: Type.Boolean,
    },
    {
      id: 'PotentialMovePath',
    }
  );
}
