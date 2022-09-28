import {ContractTransaction} from 'ethers';

export const awaitTx = (txPromise: Promise<ContractTransaction>) => txPromise.then(tx => tx.wait());
