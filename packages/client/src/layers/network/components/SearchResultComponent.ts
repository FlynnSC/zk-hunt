import {defineComponent, Type, World} from '@latticexyz/recs';

export function defineSearchResultComponent(world: World) {
  return defineComponent(
    world,
    {
      encryptedSecretNonce: Type.StringArray,
      encryptionNonce: Type.String,
    },
    {
      id: 'SearchResult',
      metadata: {
        contractId: 'zkhunt.component.SearchResult',
      },
    }
  );
}
