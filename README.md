# ZK Hunt

ZK Hunt is a prototype for an onchain game built on [mud](https://mud.dev), which explores different ZK game mechanics 
and information asymmetry. It is still very much a WIP, and has many TODOs to clean up :).

## Getting started
You will need rust, which is required for both foundry and circom, installation instructions 
[here](https://www.rust-lang.org/tools/install).

You will need foundry, installation instructions [here](https://github.com/foundry-rs/foundry), I recommend using the 
'Installing from Source' approach.

You will need circom and snarkjs, installation instructions [here](https://docs.circom.io/getting-started/installation/).

Run `yarn` to install all dependencies. If you run into a weird error about `remote-ls` failing, then try running 
`git config --global url."https://".insteadOf git://`, and then running `yarn` again.

`yarn start` will start both the local anvil node and the client. `yarn deploy` will deploy the game contracts, and 
give you back the url to access the client with.

## Scripts

`yarn prepareCircuit <circuit name>`, where `<circuit_name>` is the name of one of the circuits
in `packages/circuits/src/` but without the `.circom` extension, will compile the circuit, generate and copy the
necessary files into `static/circuits/`, and generate a solidity verifier contract in
`packages/contracts/src/dependencies/`.

`yarn prepareAllCircuits` will perform the powers of tua ceremony (if not already performed, output save in
`packages/circuits/pot/`), and then run the above command for all circom files in `packges/circuits/src/`. Run this if
starting the repo for the first time.

## Gameplay

The 'Spawn' button in the component browser on the right can be used to spawn new units in, which can be selected by 
clicking on them. Holding E will display a potential path to the cursor, and clicking will confirm that path. If you 
keep holding down E after confirming the path then you can confirm the next waypoint by clicking again somewhere else. 
Tapping R while holding E will switch the axis bias of the potential path. You can access the spear with W and the 
search with Q.
