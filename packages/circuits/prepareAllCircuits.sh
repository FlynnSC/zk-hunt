#! /bin/sh

# Performs powers of tua ceremony if not already performed
if [ ! -d "pot" ]; then
  mkdir pot
  cd pot
  snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
  snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
  snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
  cd ..
fi

# Prepares each circuit in src/
for entry in src/*.circom
do
  entry="${entry##*/}"
  bash prepareCircuit.sh "${entry%.circom}"
done
