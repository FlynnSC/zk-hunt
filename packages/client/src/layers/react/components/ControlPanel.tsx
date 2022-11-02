import React from 'react';
import {registerUIComponent} from '../engine';
import {of} from 'rxjs';
import styled from 'styled-components';

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
          api: {spawn},
          network: {connectedAddress}
        }
      } = layers;
      const onSpawn = () => spawn(connectedAddress.get()!);

      return (
        <Container>
          <button onClick={onSpawn}>Spawn</button>
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
