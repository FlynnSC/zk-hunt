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
import {drawTileRects} from '../../../utils/drawing';
import {getEntityWithComponentValue, getGodIndexStrict, getUniqueEntityId} from '../../../utils/entity';
import {getMapTileValue, getParsedMapDataFromComponent} from '../../../utils/mapData';
import {Coord} from '@latticexyz/utils';
import {ComponentValueFromComponent, lastElementOf} from '../../../utils/misc';
import {jungleHitAvoidProver} from '../../../utils/zkProving';
import {spearHitTileOffsetList} from '../../../utils/hitTiles';

export function createHitSystem(network: NetworkLayer, phaser: PhaserLayer) {
  const {
    world,
    api: {createHit, jungleHitAvoid, jungleHitReceive},
    components: {HitTiles, PotentialHits, MapData},
  } = network;

  const {
    scenes: {Main: {input, objectPool}},
    components: {
      LocalPosition, LocallyControlled, Nonce, CursorTilePosition, PrimingAttack,
      PotentialHitTiles, PendingHitTiles, ResolvedHitTiles, ActionSourcePosition
    },
  } = phaser;

  const getAttackDirectionIndex = (actionSourcePosition: Coord) => {
    const cursorPosition = getComponentValue(CursorTilePosition, getGodIndexStrict(world));
    if (!cursorPosition) return undefined;

    const angle = angleTowardPosition(actionSourcePosition, cursorPosition);
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

  // Handles drawing and removal of potential hit tiles rects
  defineComponentSystem(world, PotentialHitTiles, ({entity, value}) => {
    drawTileRects(objectPool, entity, 'PotentialHitTileRect', value[0], value[1], 0xff8800, 0.2);
  });

  // TODO prevent creating a new attack if there is already one pending?
  
  // Handles submission of an attack, and converting potential hit tiles to pending hit tiles
  input.click$.subscribe(() => {
    const entity = getEntityWithComponentValue(PrimingAttack);
    if (!entity) return;

    const actionSourcePosition = getComponentValueStrict(ActionSourcePosition, entity);
    const direction = getAttackDirectionIndex(actionSourcePosition);
    if (direction !== undefined) {
      const hitTilesEntityID = getUniqueEntityId(world);
      const hitTilesEntity = world.registerEntity({id: hitTilesEntityID});
      createHit(world.entities[entity], hitTilesEntityID, direction);
      const potentialHitTiles = getComponentValueStrict(PotentialHitTiles, entity);
      removeComponent(PrimingAttack, entity);
      setComponent(PendingHitTiles, hitTilesEntity, potentialHitTiles);
    }
  });

  // Handles drawing and removal of pending hit tiles rects
  defineComponentSystem(world, PendingHitTiles, ({entity, value}) => {
    drawTileRects(objectPool, entity, 'PendingHitTileRect', value[0], value[1], 0xff8800);
  });

  const checkIfPotentialHitsAreActive = (hitTilesEntity: EntityIndex) => {
    const entityID = world.entities[hitTilesEntity];
    let found = false;
    PotentialHits.values.value.forEach(ids => ids.forEach(id => {
      if (id === entityID) {
        found = true;
      }
    }));
    return found;
  };

  type HitTilesType = ComponentValueFromComponent<typeof PendingHitTiles>

  // Removes resolved hit tiles after 2 seconds
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

  // Updates pending hit tiles to resolved hit tiles (if they can be resolved), when the hit tiles
  // are created in the contract
  defineComponentSystem(world, HitTiles, ({entity, value}) => {
    const hitTiles = value[0];

    // Only do something if the pending hit tiles still exist (contract hit tiles are never deleted,
    // so this ensures that wierd long-term update behavior doesn't happen???)
    if (hitTiles && hasComponent(PendingHitTiles, entity)) {
      let resolvedHitTiles: HitTilesType;
      if (checkIfPotentialHitsAreActive(entity)) {
        resolvedHitTiles = {xValues: [] as number[], yValues: [] as number[]};
        const pendingHitTiles = {xValues: [] as number[], yValues: [] as number[]};

        const parsedMapData = getParsedMapDataFromComponent(MapData);
        hitTiles.xValues.forEach((x, index) => {
          const y = hitTiles.yValues[index];

          // True if jungle (pending resolution), false if plains (instantly resolved)
          if (getMapTileValue(parsedMapData, {x, y})) {
            pendingHitTiles.xValues.push(x);
            pendingHitTiles.yValues.push(y);
          } else {
            resolvedHitTiles.xValues.push(x);
            resolvedHitTiles.yValues.push(y);
          }
        });

        setComponent(PendingHitTiles, entity, pendingHitTiles);
      } else {
        resolvedHitTiles = {xValues: hitTiles.xValues, yValues: hitTiles.yValues};
        removeComponent(PendingHitTiles, entity);
      }
      setComponent(ResolvedHitTiles, entity, resolvedHitTiles);
      createHitTilesExpiryTimeout(entity, resolvedHitTiles);
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
    if (currIDs.length > prevIDs.length) {
      // jungleHit/jungleDodge response
      if (getComponentValue(LocallyControlled, entity)) {
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
          if (wasHit) {
            console.log('Was hit :(');
            const nonce = getComponentValueStrict(Nonce, entity).value;
            jungleHitReceive(entityID, hitTilesEntityID, entityPosition, nonce);
          } else {
            console.log('Dodged jungle hit :D');
            jungleHitAvoidProver({
              ...entityPosition,
              hitTilesXValues: hitTiles.xValues,
              hitTilesYValues: hitTiles.yValues,
              hitTilesMerkleRoot: hitTiles.merkleRoot
            }).then(({proofData}) => {
              jungleHitAvoid(entityID, hitTilesEntityID, proofData);
            });
          }
        }, 0);
      }
    } else {
      // Finds the id that has been removed
      const hitTilesEntityID = prevIDs.find((id, index) => currIDs[index] !== id) as EntityID;
      const hitTilesEntity = world.getEntityIndexStrict(hitTilesEntityID);

      // Pending hit tiles expiry if possible
      if (!checkIfPotentialHitsAreActive(hitTilesEntity)) {
        const pendingHitTiles = getComponentValue(PendingHitTiles, hitTilesEntity);
        if (pendingHitTiles) {
          removeComponent(PendingHitTiles, hitTilesEntity);
          const resolvedHitTiles = getComponentValue(ResolvedHitTiles, hitTilesEntity) ??
            {xValues: [], yValues: []};
          setComponent(ResolvedHitTiles, hitTilesEntity, {
            xValues: [...resolvedHitTiles.xValues, ...pendingHitTiles.xValues],
            yValues: [...resolvedHitTiles.yValues, ...pendingHitTiles.yValues],
          });

          createHitTilesExpiryTimeout(hitTilesEntity, pendingHitTiles);
        }
      }
    }
  });

  // Handles drawing and removal of resolved hit tiles rects
  defineComponentSystem(world, ResolvedHitTiles, ({entity, value}) => {
    drawTileRects(objectPool, entity, 'ResolvedHitTileRect', value[0], value[1], 0xff0000);
  });

  // TODO make it so that resolved hit tiles get rid of potential positions indicators???
}
