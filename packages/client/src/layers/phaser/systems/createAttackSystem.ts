import {NetworkLayer} from '../../network';
import {PhaserLayer} from '../types';
import {
  defineComponentSystem,
  EntityID,
  EntityIndex,
  getComponentValue,
  getComponentValueStrict,
  hasComponent,
  removeComponent,
  setComponent
} from '@latticexyz/recs';
import {angleTowardPosition, coordsEq, positionToIndex} from '../../../utils/coords';
import {drawTileSprites} from '../../../utils/drawing';
import {getEntityWithComponentValue, getGodIndexStrict, getUniqueEntityId} from '../../../utils/entity';
import {getParsedMapData, isMapTileJungle} from '../../../utils/mapData';
import {Coord} from '@latticexyz/utils';
import {ComponentValueFromComponent, lastElementOf} from '../../../utils/misc';
import {jungleHitAvoidProver, positionCommitmentProver} from '../../../utils/zkProving';
import {spearHitTileOffsetList} from '../../../utils/hitTiles';
import {Sprites} from '../constants';

export function createAttackSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    api: {attack, jungleAttack, jungleHitAvoid, jungleHitReceive},
    components: {HitTiles, PotentialHits, MapData, PositionCommitment, JungleMoveCount},
  } = network;

  const {
    scenes: {Main},
    components: {
      LocalPosition, LocallyControlled, Nonce, CursorTilePosition, PrimingAttack,
      PotentialHitTiles, PendingHitTiles, ResolvedHitTiles, ActionSourcePosition
    },
  } = phaser;

  const getAttackDirectionIndex = (actionSourcePosition: Coord) => {
    const cursorPosition = getComponentValue(CursorTilePosition, getGodIndexStrict(world));
    if (!cursorPosition) return undefined;

    // Bias corrects slight direction mismatch for some angle
    const bias = 5;
    const angle = angleTowardPosition(actionSourcePosition, cursorPosition) + bias;
    return Math.floor(angle / 360 * spearHitTileOffsetList.length);
  };

  const updatePotentialHitTiles = (entity: EntityIndex) => {
    const actionSourcePosition = getComponentValueStrict(ActionSourcePosition, entity);
    const directionIndex = getAttackDirectionIndex(actionSourcePosition);
    if (directionIndex === undefined) return;

    const offsets = spearHitTileOffsetList[directionIndex];
    const xValues = [] as number[];
    const yValues = [] as number[];
    offsets.forEach(([xOffset, yOffset]) => {
      xValues.push(actionSourcePosition.x + xOffset);
      yValues.push(actionSourcePosition.y + yOffset);
    });
    setComponent(PotentialHitTiles, entity, {xValues, yValues});
  };

  // Updates the potential hit tiles when the cursor moves
  defineComponentSystem(world, CursorTilePosition, ({value}) => {
    const entity = getEntityWithComponentValue(PrimingAttack);
    const cursorPosition = value[0];
    if (entity && cursorPosition) {
      updatePotentialHitTiles(entity);
    }
  });

  // Updates the potential hit tiles when PrimingAttack changes
  defineComponentSystem(world, PrimingAttack, ({entity, value}) => {
    if (value[0]) {
      updatePotentialHitTiles(entity);
    } else {
      removeComponent(PotentialHitTiles, entity);
    }
  });

  // Updates the potential hit tiles when the ActionSourcePosition changes
  defineComponentSystem(world, ActionSourcePosition, ({entity}) => {
    if (getComponentValue(PrimingAttack, entity)) {
      updatePotentialHitTiles(entity);
    }
  });

  // Handles drawing and removal of potential hit tiles sprites
  defineComponentSystem(world, PotentialHitTiles, ({entity, value}) => {
    drawTileSprites(
      Main, entity, 'PotentialHitTileSprite', value[0], value[1], Sprites.Hit, {alpha: 0.4}
    );
  });

  // TODO prevent creating a new attack if there is already one pending?

  // Handles submission of an attack, and converting potential hit tiles to pending hit tiles
  Main.input.click$.subscribe(() => {
    const entity = getEntityWithComponentValue(PrimingAttack);
    if (!entity) return;

    const actionSourcePosition = getComponentValueStrict(ActionSourcePosition, entity);
    const directionIndex = getAttackDirectionIndex(actionSourcePosition);
    if (directionIndex !== undefined) {
      const hitTilesEntityID = getUniqueEntityId(world);
      const hitTilesEntity = world.registerEntity({id: hitTilesEntityID});
      if (hasComponent(JungleMoveCount, entity)) {
        const nonce = getComponentValueStrict(Nonce, entity).value;
        positionCommitmentProver({...actionSourcePosition, nonce}).then(({proofData}) => {
          jungleAttack(
            world.entities[entity], actionSourcePosition, proofData, hitTilesEntityID, directionIndex
          );
        });
      } else {
        attack(world.entities[entity], hitTilesEntityID, directionIndex);
      }

      const potentialHitTiles = getComponentValueStrict(PotentialHitTiles, entity);
      removeComponent(PrimingAttack, entity);
      setComponent(PendingHitTiles, hitTilesEntity, potentialHitTiles);
    }
  });

  // Handles drawing and removal of pending hit tiles sprites
  defineComponentSystem(world, PendingHitTiles, ({entity, value}) => {
    drawTileSprites(
      Main, entity, 'PendingHitTileSprite', value[0], value[1], Sprites.Hit, {alpha: 0.7}
    );
  });

  type HitTilesType = ComponentValueFromComponent<typeof PendingHitTiles>;

  // Removes resolved hit tiles after 1 second
  const createHitTilesExpiryTimeout = (
    hitTilesEntity: EntityIndex, hitTilesToExpire: HitTilesType
  ) => setTimeout(() => {
    const oldResolvedHitTiles = getComponentValueStrict(ResolvedHitTiles, hitTilesEntity);

    // Remove the component if getting rid of the expiring resolved hit tiles would make it
    // empty, otherwise just filter out the expiring hit tiles
    if (oldResolvedHitTiles.xValues.length === hitTilesToExpire.xValues.length) {
      removeComponent(ResolvedHitTiles, hitTilesEntity);
    } else {
      const indicesToRemove = new Set(hitTilesToExpire.xValues.map((x, index) => (
        positionToIndex({x, y: hitTilesToExpire.yValues[index]})
      )));
      const newResolvedHitTiles = {xValues: [] as number[], yValues: [] as number[]};
      oldResolvedHitTiles.xValues.forEach((x, index) => {
        const y = oldResolvedHitTiles.yValues[index];
        if (!indicesToRemove.has(positionToIndex({x, y}))) {
          newResolvedHitTiles.xValues.push(x);
          newResolvedHitTiles.yValues.push(y);
        }
      });
      setComponent(ResolvedHitTiles, hitTilesEntity, newResolvedHitTiles);
    }
  }, 1000);

  // Updates pending and resolved hit tiles when the contract hit tiles are created, and sets a
  // removal timeout for the resolved hit tiles
  defineComponentSystem(world, HitTiles, ({entity, value}) => {
    const hitTiles = value[0];

    if (hitTiles) {
      // If this hit tiles entity doesn't have any associated hits (hitTiles.merkleRoot will be 0),
      // then sets them all to resolved, otherwise sorts the hit tiles into pending and resolved
      let resolvedHitTiles: HitTilesType;
      if (hitTiles.merkleRoot === '0x00') {
        resolvedHitTiles = {xValues: hitTiles.xValues, yValues: hitTiles.yValues};
        removeComponent(PendingHitTiles, entity);
      } else {
        resolvedHitTiles = {xValues: [] as number[], yValues: [] as number[]};
        const pendingHitTiles = {xValues: [] as number[], yValues: [] as number[]};

        const parsedMapData = getParsedMapData(MapData);
        hitTiles.xValues.forEach((x, index) => {
          const y = hitTiles.yValues[index];

          if (isMapTileJungle(parsedMapData, {x, y})) {
            pendingHitTiles.xValues.push(x);
            pendingHitTiles.yValues.push(y);
          } else {
            resolvedHitTiles.xValues.push(x);
            resolvedHitTiles.yValues.push(y);
          }
        });

        setComponent(PendingHitTiles, entity, pendingHitTiles);
      }
      setComponent(ResolvedHitTiles, entity, resolvedHitTiles);
      createHitTilesExpiryTimeout(entity, resolvedHitTiles);
    } else {
      // Resolve and set expiry for any pending tiles that are left when the contract hit tiles are
      // destroyed
      const pendingHitTiles = getComponentValue(PendingHitTiles, entity);
      if (pendingHitTiles) {
        setComponent(ResolvedHitTiles, entity, pendingHitTiles);
        removeComponent(PendingHitTiles, entity);
        createHitTilesExpiryTimeout(entity, pendingHitTiles);
      }
    }
  });

  // TODO make it so that the client can't submit any actions for an entity if there are potential
  // hits pending for it VVV

  // Handles the jungleHit/jungleDodge response when a new potential hit is registered, as well as
  // resolving pending hit tiles if all potential hits for the hit tiles entity are removed
  defineComponentSystem(world, PotentialHits, ({entity, value}) => {
    const currIDs = value[0]?.value ?? [];
    const prevIDs = value[1]?.value ?? [];

    // Assumes that the potential hits array can only change by a single element at a time
    if (currIDs.length > prevIDs.length && hasComponent(LocallyControlled, entity)) {
      // Because the potential hits are created before the hit tiles entity contract-side (for
      // good reason), the world.getEntityIndexStrict() will fail unless put into a timeout with
      // length 0, to allow the update to HitTiles to be processed first
      setTimeout(() => {
        // A newly added id will always be at the end
        const hitTilesEntityID = lastElementOf(currIDs) as EntityID;
        const hitTilesEntityIndex = world.getEntityIndexStrict(hitTilesEntityID);
        const hitTiles = getComponentValueStrict(HitTiles, hitTilesEntityIndex);
        const entityPosition = getComponentValueStrict(LocalPosition, entity);

        let wasHit = false;
        hitTiles.xValues.forEach((x, index) => {
          if (coordsEq(entityPosition, {x, y: hitTiles.yValues[index]})) {
            wasHit = true;
          }
        });

        const entityID = world.entities[entity];
        const nonce = getComponentValueStrict(Nonce, entity).value;
        if (wasHit) {
          jungleHitReceive(entityID, hitTilesEntityID, entityPosition, nonce);
        } else {
          jungleHitAvoidProver({
            ...entityPosition,
            nonce,
            positionCommitment: getComponentValueStrict(PositionCommitment, entity).value,
            hitTilesXValues: hitTiles.xValues,
            hitTilesYValues: hitTiles.yValues,
          }).then(({proofData}) => {
            jungleHitAvoid(entityID, hitTilesEntityID, proofData);
          });
        }
      }, 0);
    }
  });

  // Handles drawing and removal of resolved hit tiles sprites
  defineComponentSystem(world, ResolvedHitTiles, ({entity, value}) => {
    drawTileSprites(
      Main, entity, 'ResolvedHitTileSprite', value[0], value[1], Sprites.Hit,
      {alpha: 0.6, tint: 0xff0000}
    );
  });

  // TODO make it so that resolved hit tiles get rid of potential positions indicators???
}
