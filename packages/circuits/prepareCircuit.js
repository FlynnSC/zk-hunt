const shell = require('shelljs');
const crypto = require('node:crypto');
const fs = require('fs');

// Compile circuit and generate needed files
const circuitName = process.argv[2];
const randomness = crypto.randomBytes(32).toString('hex');
shell.cd('src');
shell.exec(`circom "${circuitName}.circom" --r1cs --wasm`);
shell.exec(`snarkjs groth16 setup "${circuitName}.r1cs" ../pot/pot14_final.ptau circuit_0000.zkey`);
shell.exec(`echo ${randomness} | snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey --name="1st Contributor Name" -v`);
shell.exec(`snarkjs zkey export verificationkey circuit_final.zkey verification_key.json`);
shell.rm(`${circuitName}.r1cs`);
shell.rm('circuit_0000.zkey');

// Create contract, and rename contract name inside source file, update solidity version, refactor
// how the proof params are passed in from the generated version, and make the verifier panic if
// verification fails rather than returning a boolean
const verifierName = `${`${circuitName.slice(0, 1).toUpperCase()}${circuitName.slice(1)}`}Verifier`
const directory = '../../contracts/src/dependencies';
const fileName = `${directory}/${verifierName}.sol`
if (!fs.existsSync(directory)) shell.mkdir(directory);

shell.exec(`snarkjs zkey export solidityverifier circuit_final.zkey ${fileName}`);
let contract = fs.readFileSync(fileName, 'utf8');
contract = contract.replace('contract Verifier', `contract ${verifierName}`); // Rename contract
contract = contract.replace('0.6.11;', '0.8.12;'); // Solidity version update

// Refactor proof param passing
contract = contract.replace(/uint\[2] memory a,\s*uint\[2]\[2] memory b,\s*uint\[2] memory c/g, 'uint[8] memory proofData');
contract = contract.replace(/a\[0], a\[1]/g, 'proofData[0], proofData[1]');
contract = contract.replace(/\[b\[0]\[0], b\[0]\[1]], \[b\[1]\[0], b\[1]\[1]]/g, '[proofData[2], proofData[3]], [proofData[4], proofData[5]]');
contract = contract.replace(/c\[0], c\[1]/g, 'proofData[6], proofData[7]');

// Make the verifier panic if verification fails rather than returning a boolean
contract = contract.replace(/\/\/\/ @return r  bool true if proof is valid/g, '');
contract = contract.replace(/public view returns \(bool r\)/g, 'public view');
contract = contract.replace(/return true;/g, 'return;');
contract = contract.replace(/return false;/g, 'require(false, "Invalid proof");');

fs.writeFileSync(fileName, contract);

// Create folder in static/circuits/ for the circuit if it doesn't already exist, and
// copy over the necessary files
const circuitDir = `../../../static/circuits/${circuitName}`
shell.mkdir('-p', circuitDir);
shell.mv(`${circuitName}_js/${circuitName}.wasm`, `${circuitDir}/circuit.wasm`);
shell.mv(['circuit_final.zkey', 'verification_key.json'], circuitDir);
shell.rm('-r', `${circuitName}_js`);
