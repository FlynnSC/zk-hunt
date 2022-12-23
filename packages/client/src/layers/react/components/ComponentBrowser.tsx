import React from 'react';
import {Browser} from '@latticexyz/ecs-browser';
import {registerUIComponent} from '../engine';
import {of} from 'rxjs';

export function registerComponentBrowser() {
  registerUIComponent(
    'ComponentBrowser',
    {
      colStart: 10,
      colEnd: 13,
      rowStart: 3,
      rowEnd: 13
    },
    (layers) => of(layers),
    (layers) => {
      return (
        // lol
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        <Browser
          world={layers.network.world}
          entities={layers.network.world.entities}
          layers={layers}
          devHighlightComponent={layers.network.dev.DevHighlightComponent}
          hoverHighlightComponent={layers.network.dev.HoverHighlightComponent}
          setContractComponentValue={layers.network.dev.setContractComponentValue}
        />
      );
    }
  );
}
