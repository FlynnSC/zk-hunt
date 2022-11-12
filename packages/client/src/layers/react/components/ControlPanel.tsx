import React from 'react';
import {registerUIComponent} from '../engine';
import {of} from 'rxjs';
import styled from 'styled-components';
import {getComponentValueStrict, hasComponent} from '@latticexyz/recs';
import {getSelectedEntity} from '../../phaser/components/SelectedComponent';
import {random} from '@latticexyz/utils';
import {positionToIndex} from '../../../utils/coords';
import {potentialPositionsRevealProver} from '../../../utils/zkProving';

export function registerControlPanel() {
  registerUIComponent(
    "ControlPanel",
    {
      colStart: 10,
      colEnd: 13,
      rowStart: 1,
      rowEnd: 2,
    },
    (layers) => of(layers),
    (layers) => {
      const {
        network: {
          world,
          api: {spawn, revealPotentialPositions},
          network: {connectedAddress},
          components: {JungleMoveCount, PositionCommitment}
        },
        phaser: {
          components: {LocalPosition, PotentialPositions, Selected, Nonce},
        }
      } = layers;

      const onSpawn = () => spawn(connectedAddress.get()!);

      const onRevealPotentialPositions = () => {
        const selectedEntity = getSelectedEntity(Selected);

        // Do nothing if no entity is selected, or the selected entity isn't in the jungle
        if (!selectedEntity || !hasComponent(JungleMoveCount, selectedEntity)) return;

        const entityPosition = getComponentValueStrict(LocalPosition, selectedEntity);
        const potentialPositions = getComponentValueStrict(PotentialPositions, selectedEntity);
        const revealedPotentialPositions = {
          xValues: [entityPosition.x], yValues: [entityPosition.y]
        };
        const seenPositionIndices = new Set([positionToIndex(entityPosition)])

        for (let i = 0; i < 3; ++i) {
          while (true) {
            const randIndex = random(potentialPositions.xValues.length - 1);
            const x = potentialPositions.xValues[randIndex];
            const y = potentialPositions.yValues[randIndex];

            // If there are less than 4 potential positions to choose from, allow collisions,
            // otherwise keep looping until a unique one is found
            const positionIndex = positionToIndex({x, y});
            if (potentialPositions.xValues.length < 4 || !seenPositionIndices.has(positionIndex)) {
              revealedPotentialPositions.xValues.push(x);
              revealedPotentialPositions.yValues.push(y);
              seenPositionIndices.add(positionIndex);
              break;
            }
          }
        }

        const nonce = getComponentValueStrict(Nonce, selectedEntity).value;
        const positionCommitment = getComponentValueStrict(PositionCommitment, selectedEntity).value;
        potentialPositionsRevealProver({
          x: entityPosition.x, y: entityPosition.y, nonce, positionCommitment,
          potentialPositionsXValues: revealedPotentialPositions.xValues,
          potentialPositionsYValues: revealedPotentialPositions.yValues,
        }).then(({proofData}) => {
          revealPotentialPositions(
            world.entities[selectedEntity],
            revealedPotentialPositions,
            proofData
          );
        });
      };

      return (
        <Container>
          <button onClick={onSpawn}>Spawn</button>
          <button onClick={onRevealPotentialPositions}>Reveal</button>
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
