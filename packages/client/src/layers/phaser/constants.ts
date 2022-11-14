export const TILE_WIDTH = 16;
export const TILE_HEIGHT = 16;

export enum Scenes {
  Main = 'Main',
}

export enum Maps {
  Main = 'MainMap',
}

export enum Assets {
  OverworldTileset = 'OverworldTileset',
  MountainTileset = 'MountainTileset',
  MainAtlas = 'MainAtlas',
}

export enum Sprites {
  Hero,
  Settlement,
  Gold,
  Inventory,
  GoldShrine,
  EmberCrown,
  EscapePortal,
  Donkey,
  DonkeySelected,
  Cursor,
  MovePathStraight,
  MovePathCorner,
  MovePathEnd,
  Hit,
}

export enum Animations {}

export const UnitTypeSprites: Record<number, Sprites> = {};

export const ItemTypeSprites: Record<number, Sprites> = {};

export const StructureTypeSprites: Record<number, Sprites> = {};
