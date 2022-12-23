import React from 'react';
import {registerUIComponent} from '../engine';
import styled from 'styled-components';
import {defineQuery, getComponentValue, Has} from '@latticexyz/recs';
import {map, merge, startWith} from 'rxjs';

export function registerLootCounter() {
  registerUIComponent(
    'LootCounter',
    {
      colStart: 10,
      colEnd: 13,
      rowStart: 2,
      rowEnd: 3
    },
    (layers) => {
      const {phaser: {components: {Selected}}, network: {components: {LootCount}}} = layers;
      return merge(
        defineQuery([Has(Selected)]).update$,
        defineQuery([Has(LootCount)]).update$
      ).pipe(map(({entity, value}) => {
        return {lootCount: value[0] ? Number(getComponentValue(LootCount, entity)?.value || 0) : NaN};
      }), startWith({lootCount: NaN}));
    },
    ({lootCount}) => {
      return (
        <Container>
          Loot: {isNaN(lootCount) ? 'No entity selected' : lootCount}
        </Container>
      );
    }
  );
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  padding: 0.5rem;
  background: rgba(27, 28, 32, 1);
`;
