import {defineComponent, Type, World} from '@latticexyz/recs';

export function defineConfigComponent(world: World) {
  return defineComponent(
    world,
    {
      ignoreChallenge: Type.Boolean,
      delayHiddenChallengeResponse: Type.Boolean
    },
    {
      id: 'Config'
    }
  );
}
