import { SetupContractConfig } from "./setup/setupContracts";

export type GameConfig = {
  worldAddress: string;
  privateKey: string;
  chainId: number;
  jsonRpc: string;
  wsRpc?: string;
  checkpointUrl?: string;
  devMode: boolean;
  initialBlockNumber: number;
};

export const getNetworkConfig: (networkConfig: GameConfig) => SetupContractConfig = (config) => ({
  clock: {
    period: 1000,
    initialTime: 0,
    syncInterval: 5000,
  },
  provider: {
    jsonRpcUrl: config.jsonRpc,
    wsRpcUrl: config.wsRpc,
    options: {
      batch: false,
    },
  },
  privateKey: config.privateKey,
  chainId: config.chainId,
  checkpointServiceUrl: config.checkpointUrl,
  initialBlockNumber: config.initialBlockNumber,
  worldAddress: config.worldAddress,
  devMode: config.devMode,
});
