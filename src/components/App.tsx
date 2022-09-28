import React from 'react';
import styled from 'styled-components';
import {Page} from './Page/Page';
import '@rainbow-me/rainbowkit/styles.css';
import {darkTheme, getDefaultWallets, RainbowKitProvider} from '@rainbow-me/rainbowkit';
import {chain, configureChains, createClient, WagmiConfig} from 'wagmi';
import {publicProvider} from 'wagmi/providers/public';
import {BrowserRouter} from 'react-router-dom';
import {ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import {styling} from './styling';

const {chains, provider} = configureChains(
  [chain.hardhat],
  [
    // alchemyProvider({alchemyId: process.env.ALCHEMY_ID}),
    publicProvider()
  ]
);

const {connectors} = getDefaultWallets({
  appName: 'My RainbowKit App',
  chains
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider
});

const theme = darkTheme({
  borderRadius: 'small',
});

export enum Path {
  HOME = 'home',
}

export const App = () => (
  <WagmiConfig client={wagmiClient}>
    <RainbowKitProvider chains={chains} theme={theme}>
      <BrowserRouter>
        <PageContainer>
          <ToastContainer theme="dark" style={{fontSize: '16px'}}/>
          <ContentContainer>
            <Page/>
            {/*<Routes>*/}
            {/*  <Route path={Path.CREATE} element={<CreatePage/>}/>*/}
            {/*  <Route path={Path.MANAGE} element={<div>yo</div>}/>*/}
            {/*  <Route path={Path.BROWSE} element={<BrowsePage/>}/>*/}
            {/*  <Route path="*" element={<Navigate to={Path.CREATE} replace/>}/>*/}
            {/*</Routes>*/}
          </ContentContainer>
        </PageContainer>
      </BrowserRouter>
    </RainbowKitProvider>
  </WagmiConfig>
);

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  color: ${styling.text};
  font-size: 16px;
  font-family: monospace;
  background: ${styling.background};
  overflow-x: hidden;
  overflow-y: scroll;

  a {
    color: #2dbff8;
    text-decoration: none;
    transition: color 0.1s;

    &:hover {
      color: #4cdcfd;
    }
  }
`;

const ContentContainer = styled.div`
  flex-grow: 1;
`;
