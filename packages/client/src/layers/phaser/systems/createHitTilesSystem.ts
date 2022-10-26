import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {
  defineComponentSystem,
  EntityID,
  EntityIndex,
  getComponentValue,
  getComponentValueStrict,
  HasValue,
  runQuery
} from '@latticexyz/recs';
import {TILE_HEIGHT, TILE_WIDTH} from '../constants';
import {tileCoordToPixelCoord} from '@latticexyz/phaserx';
import {coordsEq} from '../../../utils/coords';
import {jungleHitAvoidProver} from '../../../utils/zkProving';

export function createHitTilesSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    api: {jungleHitAvoid, jungleHitReceive},
    components: {HitTiles, PotentialHit},
  } = network;

  const {
    scenes: {Main: {objectPool}},
    components: {LocalPosition, LocallyControlled, Nonce},
  } = phaser;

  const attemptHitTilesRemoval = (entity: EntityIndex) => {
    const potentiallyHitEntities = runQuery(
      [HasValue(PotentialHit, {value: world.entities[entity]})]
    );
    if (potentiallyHitEntities.size === 0) {
      [0, 1, 2, 3].forEach(index => {
        objectPool.remove(`${entity}HitTileRect${index}`);
      });
    }
  };

  // TODO make it so that resolved hit tiles get rid of potential positions indicators???

  // Draws the hit tiles rect when created, and destroys the sprite when removed
  defineComponentSystem(world, HitTiles, ({entity, value}) => {
    const hitTiles = value[0];

    if (hitTiles) {
      hitTiles.xValues.forEach((x, index) => {
        const hitTilePosition = {x, y: hitTiles.yValues[index]};
        const hitTileRect = objectPool.get(`${entity}HitTileRect${index}`, 'Rectangle');
        hitTileRect.setComponent({
          id: 'HitTileRect',
          once: gameObject => {
            const pixelPosition = tileCoordToPixelCoord(hitTilePosition, TILE_WIDTH, TILE_HEIGHT);
            gameObject.setPosition(pixelPosition.x, pixelPosition.y);
            gameObject.setSize(TILE_WIDTH, TILE_HEIGHT);
            gameObject.setFillStyle(0xff0000, 0.4);
          },
        });

        // If there are no potentially hit entities after 3 seconds, remove hit rects
        setTimeout(() => attemptHitTilesRemoval(entity), 3000);
      });
    }
  });

  defineComponentSystem(world, PotentialHit, ({entity, value}) => {
    if (value[0]) {
      if (getComponentValue(LocallyControlled, entity)) {
        const hitTilesEntityIndex = world.getEntityIndexStrict(value[0].value as EntityID);
        const hitTiles = getComponentValueStrict(HitTiles, hitTilesEntityIndex);
        const entityPosition = getComponentValueStrict(LocalPosition, entity);

        let wasHit = false;
        hitTiles.xValues.forEach((x, index) => {
          if (coordsEq(entityPosition, {x, y: hitTiles.yValues[index]})) {
            wasHit = true;
          }
        });

        const entityID = world.entities[entity];
        if (wasHit) {
          console.log('Was hit :(');
          jungleHitReceive(
            entityID,
            entityPosition,
            getComponentValueStrict(Nonce, entity).value
          );
        } else {
          console.log('Dodged jungle hit :D');
          jungleHitAvoidProver({
            ...entityPosition,
            hitTilesXValues: hitTiles.xValues,
            hitTilesYValues: hitTiles.yValues,
            hitTilesMerkleRoot: hitTiles.merkleRoot
          }).then(({proofData}) => {
            jungleHitAvoid(entityID, proofData);
          });
        }
      }
    } else {
      // TODO probably structure this removal logic better bruhhh
      // Removes hit tiles rects if they should no longer be shown
      attemptHitTilesRemoval(world.entityToIndex.get(value[1]?.value as EntityID) as EntityIndex);
    }
  });
}
