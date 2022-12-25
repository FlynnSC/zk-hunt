import {PhaserLayer} from '../../types';
import {defineComponentSystem} from '@latticexyz/recs';
import {drawTileSprites} from '../../../../utils/drawing';
import {Sprites} from '../../constants';
import {ChallengeType} from '../../../network/components/ChallengeTilesComponent';

export function createChallengeRenderingSystem(phaser: PhaserLayer) {
  const {
    world,
    scenes: {Main},
    components: {PotentialChallengeTiles, PendingChallengeTiles, ResolvedChallengeTiles}
  } = phaser;

  // Handles drawing and removal of potential challenge tiles sprites
  defineComponentSystem(world, PotentialChallengeTiles, ({entity, value}) => {
    const sprite = value[0]?.challengeType === ChallengeType.ATTACK ? Sprites.Hit : Sprites.Eye;
    drawTileSprites(
      Main, entity, 'PotentialChallengeTiles', value[0], value[1], sprite, {alpha: 0.4}
    );
  });

  // Handles drawing and removal of pending challenge tiles sprites
  defineComponentSystem(world, PendingChallengeTiles, ({entity, value}) => {
    const sprite = value[0]?.challengeType === ChallengeType.ATTACK ? Sprites.Hit : Sprites.Eye;
    drawTileSprites(
      Main, entity, 'PendingChallengeTiles', value[0], value[1], sprite, {alpha: 0.7}
    );
  });

  // Handles drawing and removal of resolved challenge tiles sprites
  defineComponentSystem(world, ResolvedChallengeTiles, ({entity, value}) => {
    const sprite = value[0]?.challengeType === ChallengeType.ATTACK ? Sprites.Hit : Sprites.Eye;
    drawTileSprites(
      Main, entity, 'ResolvedChallengeTiles', value[0], value[1], sprite,
      {alpha: 0.6, tint: 0xff0000}
    );
  });
}
