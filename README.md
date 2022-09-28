# ZK Hunt

`bash prepareCircuit.sh <circuit name>`, where `<circuit_name>` is the name of one of the circuits in `circuits/` but
without the `.circom` extension, will compile the circuit, generate and copy the necessary files into `public/`, and
generate a solidity verifier contract in `contracts/`.

`bash prepareAllCircuits.sh` will perform the powers of tua ceremony (if not already performed, output save in
`/circuits/pot`), and then run the above command for all circom files in `circuits/`. Run this if starting the repo for
the first time.