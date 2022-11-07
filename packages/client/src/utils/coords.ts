import {Coord} from '@latticexyz/utils';
import {MAP_SIZE} from '../constants';
import {intDiv} from './misc';

export function coordsEq(a?: Coord, b?: Coord): boolean {
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y;
}

export function subtractCoords(a: Coord, b: Coord): Coord {
  return {x: a.x - b.x, y: a.y - b.y};
}

export function positionToIndex(position: Coord) {
  return position.x + position.y * MAP_SIZE;
}

export function indexToPosition(index: number) {
  return {x: index % MAP_SIZE, y: intDiv(index, MAP_SIZE)};
}

export function isPositionWithinMapBounds(position: Coord) {
  return position.x >= 0 && position.x < MAP_SIZE && position.y >= 0 && position.y < MAP_SIZE;
}

// Returns the angle from `from` to `to`, in degrees in the range [0, 360)
export function angleTowardPosition(from: Coord, to: Coord) {
  const val = Math.atan2(-(to.y - from.y), to.x - from.x) * 180 / Math.PI;
  return val >= 0 ? val : val + 360;
}
