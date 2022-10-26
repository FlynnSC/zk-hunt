import React from "react";
import { BootScreen, registerUIComponent } from "../engine";
import { concat, map } from "rxjs";
import { ComponentUpdate, EntityIndex, getComponentValue, Type } from "@latticexyz/recs";
import { GodID, SyncState } from "@latticexyz/network";

export function registerLoadingState() {
  registerUIComponent(
    "LoadingState",
    {
      rowStart: 1,
      rowEnd: 13,
      colStart: 1,
      colEnd: 13,
    },
    (layers) => {
      const {
        components: { LoadingState },
        world,
      } = layers.network;

      return concat(
        [
          {
            entity: 0 as EntityIndex,
            component: LoadingState,
            value: [{ state: -1, msg: "Initializing", percentage: 0 }, undefined],
          } as ComponentUpdate<{
            state: Type.Number;
            msg: Type.String;
            percentage: Type.Number;
          }>,
        ],
        LoadingState.update$
      ).pipe(
        map(({ value }) =>
          value[0] && value[0]["state"] !== SyncState.LIVE
            ? {
                LoadingState,
                world,
              }
            : null
        )
      );
    },

    ({ LoadingState, world }) => {
      const GodEntityIndex = world.entityToIndex.get(GodID);

      const loadingState = GodEntityIndex != null ? getComponentValue(LoadingState, GodEntityIndex) : undefined;

      if (loadingState == null) {
        return <BootScreen initialOpacity={1}>Connecting</BootScreen>;
      }

      if (loadingState.state !== SyncState.LIVE) {
        return <BootScreen initialOpacity={1}>{loadingState.msg}</BootScreen>;
      }

      return null;
    }
  );
}
