import {defineComponent, Type, World} from '@latticexyz/recs';

export enum ChallengeType {
  ATTACK,
  SEARCH
}

export function defineChallengeTilesComponent(world: World) {
  return defineComponent(
    world,
    {
      xValues: Type.NumberArray,
      yValues: Type.NumberArray,
      merkleChainRoot: Type.String,
      challengeType: Type.Number,
      challenger: Type.String,
      creationTimestamp: Type.String
    },
    {
      id: 'ChallengeTiles',
      metadata: {
        contractId: 'zkhunt.component.ChallengeTiles'
      }
    }
  );
}
