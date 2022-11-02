import {waitForComponentValue} from '@latticexyz/std-client';
import {SyncState} from '@latticexyz/network';
import {NetworkLayer} from '../layers/network';
import {EntityIndex} from '@latticexyz/recs';

export function onStateSyncComplete(network: NetworkLayer, callback: () => void) {
  const entity0 = 0 as EntityIndex;
  waitForComponentValue(
    network.components.LoadingState,
    entity0,
    {state: SyncState.LIVE}
  ).then(callback);
}
