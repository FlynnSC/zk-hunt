const shell = require('shelljs');
const crypto = require('node:crypto');
const fs = require('fs');

// Performs powers of tua ceremony if not already performed
if (!fs.existsSync('pot')) {
  const randomness = crypto.randomBytes(32).toString('hex');
  shell.mkdir('pot');
  shell.cd('pot');
  shell.exec('snarkjs powersoftau new bn128 14 pot14_0000.ptau -v');
  shell.exec(`echo ${randomness} | snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v`);
  shell.exec('snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v');
  shell.cd('..');
}

// Prepares each circuit in src/
fs.readdirSync('src').forEach(file => {
  if (file.endsWith('.circom')){
    const circuitName = file.slice(0, -7);
    shell.exec(`node prepareCircuit.js ${circuitName}`);
  }
});
