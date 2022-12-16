import {defineComponent, Type, World} from '@latticexyz/recs';

export function defineParsedMapDataComponent(world: World) {
  return defineComponent(
    world,
    {
      mapValue: Type.String, // The whole map bit packed into an int
      chunks: Type.StringArray, // Each field element
      nodes: Type.StringArray, // The merkle tree, including all chunks and the root (1 based indexing)
    },
    {
      id: 'ParsedMapData',
    }
  );
}
