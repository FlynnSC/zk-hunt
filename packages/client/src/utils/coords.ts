import {Coord} from '@latticexyz/utils';
import {MAP_SIZE} from '../constants';

export function coordsEq(a?: Coord, b?: Coord): boolean {
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y;
}

export function subtractCoords(a: Coord, b: Coord): Coord {
  return {x: a.x - b.x, y: a.y - b.y};
}

export function calcPositionIndex(position: Coord) {
  return position.x + position.y * MAP_SIZE;
}
