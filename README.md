# ZK Hunt

`yarn prepareCircuit <circuit name>`, where `<circuit_name>` is the name of one of the circuits
in `packages/circuits/src/` but without the `.circom` extension, will compile the circuit, generate and copy the
necessary files into `static/circuits/`, and generate a solidity verifier contract in
`packages/contracts/src/dependencies/`.

`yarn prepareAllCircuits` will perform the powers of tua ceremony (if not already performed, output save in
`packages/circuits/pot/`), and then run the above command for all circom files in `packges/circuits/src/`. Run this if
starting the repo for the first time.