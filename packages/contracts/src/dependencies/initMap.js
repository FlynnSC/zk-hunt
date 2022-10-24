const {poseidonContract: poseidonGenContract} = require('circomlibjs');
const ethers = require('ethers');

// TODO use this???
async function initMap() {
    let wallet = new ethers.Wallet('0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6');
    const chunks = ['0x230000008e0701400dee07e0004c1bf8003c00381018003c70060001f0040007', '0x1fe0a0009fc006033f1e0c0e383c3c3c6078f03c807000e0000000c4000003', '0x3d07cf00020e0a00001c0408002001101c0406307c0d01f0f00e03e1c01f0382', '0x3893ffc3e1615e0383808002000000000000f000785fe087e1f'];
    wallet = wallet.connect(new ethers.providers.JsonRpcProvider('http://localhost:8545'));

    const abi = [
        {
            "inputs": [
                {
                    "internalType": "contract IWorld",
                    "name": "_world",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "_components",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes",
                    "name": "arguments",
                    "type": "bytes"
                }
            ],
            "name": "execute",
            "outputs": [
                {
                    "internalType": "bytes",
                    "name": "",
                    "type": "bytes"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256[4]",
                    "name": "chunks",
                    "type": "uint256[4]"
                }
            ],
            "name": "executeTyped",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];
    const mapDataInitSystemContract = new ethers.Contract(process.argv[2], abi, wallet);
    mapDataInitSystemContract.executeTyped(chunks);
}

initMap();
