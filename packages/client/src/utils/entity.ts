import {World} from '@latticexyz/recs';
import {GodID} from '@latticexyz/network';

export function getGodIndex(world: World) {
  return world.entityToIndex.get(GodID);
}

export function getGodIndexStrict(world: World) {
  return world.getEntityIndexStrict(GodID);
}
