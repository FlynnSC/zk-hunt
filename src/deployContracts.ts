// @ts-ignore
import {poseidonContract as poseidonGenContract} from 'circomlibjs';
import hre from 'hardhat';

export const deployContracts = async () => {
  // 3 inputs (x, y, nonce)
  const inputCount = 3;
  const [signer] = await hre.ethers.getSigners();
  const Poseidon = new hre.ethers.ContractFactory(
    new hre.ethers.utils.Interface(poseidonGenContract.generateABI(inputCount)),
    poseidonGenContract.createCode(inputCount),
    signer
  );
  const poseidon = await Poseidon.deploy();
  await poseidon.deployed();

  console.log('Poseidon deployed to:', poseidon.address);

  const verifierAddresses = Object.fromEntries(await Promise.all(['JungleMove', 'JungleEnter'].map(async circuitName => {
    const verifierName = `${circuitName}Verifier`;
    const verifierFactory = await hre.ethers.getContractFactory(verifierName);
    const verifierContract = await verifierFactory.deploy();
    await verifierContract.deployed();
    console.log(`${verifierName} deployed to:`, verifierContract.address);
    return [circuitName, verifierContract.address];
  })));

  const zkHuntFactory = await hre.ethers.getContractFactory('ZKHunt');
  const zkHunt = await zkHuntFactory.deploy(
    poseidon.address,
    verifierAddresses['JungleMove'],
    verifierAddresses['JungleEnter']
  );
  await zkHunt.deployed();

  console.log('ZKHunt deployed to:', zkHunt.address);

  return [poseidon.address, verifierAddresses['JungleMove'], verifierAddresses['JungleEnter']];
};