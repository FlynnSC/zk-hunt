const { poseidonContract: poseidonGenContract } = require("circomlibjs");

// Uses the command line arg as the input count for the poseidon bytecode
console.log(poseidonGenContract.createCode(parseInt(process.argv[2])));
