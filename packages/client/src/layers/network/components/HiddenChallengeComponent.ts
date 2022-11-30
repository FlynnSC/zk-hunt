import {defineComponent, Type, World} from '@latticexyz/recs';

export function defineHiddenChallengeComponent(world: World) {
  return defineComponent(
    world,
    {
      cipherText: Type.StringArray,
      encryptionNonce: Type.String,
      challenger: Type.String,
      creationTimestamp: Type.String,
    },
    {
      id: 'HiddenChallenge',
      metadata: {
        contractId: 'zkhunt.component.HiddenChallenge',
      },
    }
  );
}
