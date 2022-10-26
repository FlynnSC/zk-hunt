import {
  AssetType,
  defineCameraConfig,
  defineMapConfig,
  defineScaleConfig,
  defineSceneConfig,
} from '@latticexyz/phaserx';
import {Assets, Maps, Scenes, Sprites, TILE_HEIGHT, TILE_WIDTH} from './constants';
import {
  TileAnimations as OverworldTileAnimations,
  Tileset as OverworldTileset,
} from '../phaser/assets/tilesets/overworldTileset';
import overworldTileset from './assets/tilesets/overworld-tileset.png';

const ANIMATION_INTERVAL = 200;

export const phaserConfig = {
  sceneConfig: {
    [Scenes.Main]: defineSceneConfig({
      assets: {
        [Assets.OverworldTileset]: {type: AssetType.Image, key: Assets.OverworldTileset, path: overworldTileset},
        [Assets.MainAtlas]: {
          type: AssetType.MultiAtlas,
          key: Assets.MainAtlas,
          path: '/atlases/sprites/atlas.json',
          options: {
            imagePath: '/atlases/sprites/',
          },
        },
      },
      maps: {
        [Maps.Main]: defineMapConfig({
          chunkSize: TILE_WIDTH * 64, // tile size * tile amount
          tileWidth: TILE_WIDTH,
          tileHeight: TILE_HEIGHT,
          backgroundTile: [OverworldTileset.Plain],
          animationInterval: ANIMATION_INTERVAL,
          tileAnimations: OverworldTileAnimations,
          layers: {
            layers: {
              Background: {tilesets: ['Default'], hasHueTintShader: true},
              Foreground: {tilesets: ['Default'], hasHueTintShader: true},
              Overlay: {tilesets: ['Default'], hasHueTintShader: true},
            },
            defaultLayer: 'Background',
          },
        }),
      },
      sprites: {
        [Sprites.Settlement]: {
          assetKey: Assets.MainAtlas,
          frame: 'sprites/resources/crystal.png',
        },
        [Sprites.Gold]: {
          assetKey: Assets.MainAtlas,
          frame: 'sprites/resources/gold.png',
        },
        // [Sprites.Container]: {
        //   assetKey: Assets.MainAtlas,
        //   frame: "sprites/resources/chest.png",
        // },
        [Sprites.GoldShrine]: {
          assetKey: Assets.MainAtlas,
          frame: 'sprites/resources/gold.png',
        },
        [Sprites.EscapePortal]: {
          assetKey: Assets.MainAtlas,
          frame: 'sprites/resources/wood.png',
        },
        [Sprites.EmberCrown]: {
          assetKey: Assets.MainAtlas,
          frame: 'sprites/resources/wood.png',
        },
        [Sprites.Donkey]: {
          assetKey: Assets.MainAtlas,
          frame: 'sprites/workers/donkey.png',
        },
        // [Sprites.Soldier]: {
        //   assetKey: Assets.MainAtlas,
        //   frame: "sprites/warriors/hero.png",
        // },
      },
      animations: [],
      tilesets: {
        Default: {assetKey: Assets.OverworldTileset, tileWidth: TILE_WIDTH, tileHeight: TILE_HEIGHT},
      },
    }),
  },
  scale: defineScaleConfig({
    parent: 'phaser-game',
    zoom: 2,
    mode: Phaser.Scale.NONE,
  }),
  cameraConfig: defineCameraConfig({
    phaserSelector: 'phaser-game',
    pinchSpeed: 1,
    wheelSpeed: 1,
    maxZoom: 1,
    minZoom: 0.66,
  }),
  cullingChunkSize: TILE_HEIGHT * 16,
};
