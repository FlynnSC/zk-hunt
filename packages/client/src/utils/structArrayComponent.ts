import {defineComponent, Schema, Type, ValueType} from '@latticexyz/recs';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const typeMappings: Record<Type, Type> = {
  [Type.Boolean]: Type.NumberArray, // Todo need Type.BooleanArray bruh
  [Type.Number]: Type.NumberArray,
  [Type.String]: Type.StringArray,
  [Type.Entity]: Type.EntityArray,
};

// TODO properly pursue this idea of an abstraction layer to facilitate an array of structs
// + singleton component
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const defineStructArrayComponent: typeof defineComponent = (world, schema, options) => {
  const remappedSchema = Object.keys(schema).reduce((obj, key) => {
    obj[`${key}Array`] = typeMappings[schema[key]];
    return obj;
  }, {} as Record<string, Type>);
  return defineComponent(world, remappedSchema, options);
};

type ToArrayType = {
  [Type.Number]: Type.NumberArray,
  [Type.String]: Type.StringArray,
  [Type.Entity]: Type.EntityArray,
};

type FromArrayType = {
  [Type.NumberArray]: Type.Number,
  [Type.StringArray]: Type.String,
  [Type.EntityArray]: Type.Entity,
};

type PropEventSource<Type> = {
  on<Key extends string & keyof Type>
  (eventName: `${Key}Changed`, callback: (newValue: Type[Key]) => void): void;
};

type TList<T extends string> = `${T}List`;

type ComponentValue<S extends Schema = Schema, T = undefined> = {
  [key in keyof S]: ValueType<T>[S[key]];
};

// type StructArrayComponentValue<
//   S extends Schema,
// > = ComponentValue<{
//   [Key in keyof S as (Key extends string ? `${Key}List` : never)]: ToArrayType[S[Key]];
// }>;
//
// type temp = {x: Type.String, y: Type.Number};
// type Test = StructArrayComponentValue<temp>;
// const x: Test = {xList: ['yo'], yList: [0]};
