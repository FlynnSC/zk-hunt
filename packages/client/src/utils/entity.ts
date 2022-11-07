import {Component, EntityID, Has, runQuery, Schema, World} from '@latticexyz/recs';
import {GodID} from '@latticexyz/network';
import {getIndexFromSet} from './misc';
import {BigNumber, ethers} from 'ethers';
import {random} from '@latticexyz/utils';

export function getGodIndex(world: World) {
  return world.entityToIndex.get(GodID);
}

export function getGodIndexStrict(world: World) {
  return world.getEntityIndexStrict(GodID);
}

export function getEntityWithComponentValue<S extends Schema>(component: Component<S>) {
  return getIndexFromSet(runQuery([Has(component)]), 0);
}

// Generates a random EntityID that doesn't yet exist. Done probabilistically, so that even if
// multiple players create new entities with ids from this function, they are extremely unlikely to
// collide
export function getUniqueEntityId(world: World) {
  let entityID: EntityID;
  do {
    entityID = ethers.utils.keccak256(BigNumber.from(random(10_000_000)).toHexString()) as EntityID;
  } while (world.hasEntity(entityID));

  return entityID;
}
