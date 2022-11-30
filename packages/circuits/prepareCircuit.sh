#! /bin/sh

# Compile circuit and generate needed files
circuitName=$1
cd src
circom "${circuitName}.circom" --r1cs --wasm
snarkjs groth16 setup "${circuitName}.r1cs" ../pot/pot14_final.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey --name="1st Contributor Name" -v
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json
rm "${circuitName}.r1cs"
rm circuit_0000.zkey

# Create contract, and rename contract name inside source file, update solidity version, and
# refactor how the proof params are passed in from the generated version
verifierName="${circuitName^}Verifier"
fileName="../../contracts/src/dependencies/${verifierName}.sol"
snarkjs zkey export solidityverifier circuit_final.zkey $fileName
sed -i -e "s/contract Verifier/contract ${verifierName}/g" $fileName # Rename contract
sed -i -e "s/0.6.11;/0.8.12;/g" $fileName # Solidity version update

# Refactor proof param passing
sed -i "s/uint\[2\] memory a/uint[8] memory proofData/g" $fileName
sed -i "/memory b,/d" $fileName
sed -i "/memory c,/d" $fileName
sed -i "s/a\[0\], a\[1\]/proofData[0], proofData[1]/g" $fileName
sed -i "s/\[b\[0\]\[0\], b\[0\]\[1\]\], \[b\[1\]\[0\], b\[1\]\[1\]\]/[proofData[2], proofData[3]], [proofData[4], proofData[5]]/g" $fileName
sed -i "s/c\[0\], c\[1\]/proofData[6], proofData[7]/g" $fileName

# Create folder in static/circuits/ for the circuit if it doesn't already exist, and
# copy over the necessary files
circuitDir="../../../static/circuits/$circuitName"
mkdir -p $circuitDir
mv "${circuitName}_js/${circuitName}.wasm" "$circuitDir/circuit.wasm"
mv circuit_final.zkey verification_key.json $circuitDir
rm -r "${circuitName}_js"
