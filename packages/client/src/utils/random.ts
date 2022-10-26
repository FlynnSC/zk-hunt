import {random} from '@latticexyz/utils';

// TODO Probably use better randomness
export function getRandomNonce() {
  return random(100_000_000);
}