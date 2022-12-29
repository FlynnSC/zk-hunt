import {random} from '@latticexyz/utils';

export function getRandomNonce() {
  return random(Number.MAX_SAFE_INTEGER);
}
