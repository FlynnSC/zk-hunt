import React from 'react';
import {Map} from './Map';
import styled from 'styled-components';
import {ConnectButton} from '@rainbow-me/rainbowkit';

export const Page = () => {
  return (
    <Container>
      <ConnectButton/>
      <Map/>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
`;
