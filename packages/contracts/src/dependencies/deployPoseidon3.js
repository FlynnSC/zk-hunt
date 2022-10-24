const {poseidonContract: poseidonGenContract} = require('circomlibjs');
const ethers = require('ethers');
const fs = require('fs');
const {Buffer} = require('node:buffer');

// TODO clean up this poseidon deploy stuff
async function deploy() {
    // 3 inputs (x, y, nonce)
    const inputCount = 3;
    let wallet = new ethers.Wallet('0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6');
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    wallet = wallet.connect(provider);
    const Poseidon = new ethers.ContractFactory(
        new ethers.utils.Interface(poseidonGenContract.generateABI(inputCount)),
        poseidonGenContract.createCode(inputCount),
        wallet
    );
    const poseidon = await Poseidon.deploy();
    await poseidon.deployed();

    console.log(ethers.utils.defaultAbiCoder.encode(['address'], [poseidon.address]));
}

function writeBytecodeToFile() {
    // 3 inputs (x, y, nonce)
    const inputCount = 3;
    const bytecodeString = poseidonGenContract.createCode(inputCount);
    const bytecode = Buffer.from(bytecodeString.slice(2), 'hex');
    fs.writeFileSync('./src/dependencies/poseidon.bytecode', bytecode);
}

deploy();
// writeBytecodeToFile();