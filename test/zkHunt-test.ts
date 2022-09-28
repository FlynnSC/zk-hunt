import hre from 'hardhat';
import {BigNumber} from 'ethers';
import {ZKHunt, ZKHunt__factory} from '../typechain-types';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {awaitTx} from '../src/ethUtils';
import {createProver} from '../src/zkUtils';
import {deployContracts} from '../src/deployContracts';

let zkHuntFactory: ZKHunt__factory;
let zkHunt: ZKHunt;
let mainSigner: SignerWithAddress;
let otherSigner: SignerWithAddress;

let contractArgAddresses: string[];

describe('ZKHunt', () => {
  before(async () => {
    contractArgAddresses = await deployContracts();
    [mainSigner, otherSigner] = await hre.ethers.getSigners();
    zkHuntFactory = await hre.ethers.getContractFactory('ZKHunt');
  });

  beforeEach(async () => {
    zkHunt = await zkHuntFactory.deploy(...contractArgAddresses as [string, string, string]); // lol
    await zkHunt.deployed();
  });


  describe('Deployment', () => {
    it('Make sure shit works bruh', async () => {
      const mapData = 12;
      await awaitTx(zkHunt.setMapData(mapData));
      await awaitTx(zkHunt.activatePlayer(mainSigner.address));

      await awaitTx(zkHunt.plainsMove(mainSigner.address, {x: 1, y: 0}));

      const jungleEnterProver = createProver('jungleEnter', false);
      let proofResult = await jungleEnterProver({x: 2, y: 0, nonce: 0});
      await awaitTx(zkHunt.jungleEnter(
        mainSigner.address,
        {x: 2, y: 0},
        BigNumber.from(proofResult.publicSignals[0]),
        proofResult.proofData
      ));

      const jungleMoveProver = createProver('jungleMove', false);
      proofResult = await jungleMoveProver({
        oldX: 2, oldY: 0, oldNonce: 0,
        newX: 3, newY: 0, mapData,
      });
      await awaitTx(zkHunt.jungleMove(
        mainSigner.address,
        BigNumber.from(proofResult.publicSignals[1]),
        proofResult.proofData,
      ));

      await awaitTx(zkHunt.jungleExit(mainSigner.address, {x: 3, y: 0}, 1, {x: 3, y: 1}));
    });
  });
});
