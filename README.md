# ZK Hunt

ZK Hunt is a prototype for an onchain game built on [mud](https://mud.dev), which explores different ZK game mechanics
and information asymmetry. The full technical write-up can be found on the [0xPARC blog](https://0xparc.org/blog/zk-hunt).

## Getting started

You will need rust, which is required for both foundry and circom, installation instructions
[here](https://www.rust-lang.org/tools/install).

You will need foundry, installation instructions [here](https://github.com/foundry-rs/foundry), I recommend using the
'Installing from Source' approach.

You will need circom and snarkjs, installation instructions [here](https://docs.circom.io/getting-started/installation/)
.

Run `yarn` to install all dependencies. If you run into a weird error about `remote-ls` failing, then try running
`git config --global url."https://".insteadOf git://`, and then running `yarn` again.

Inside `packages/circuits`, run `node prepareAllCircuits.js` to perform the powers of tau ceremony, and compile all the ZK circuits.

`yarn start` will start both the local anvil node and the client, press `2` to show the client console output, and restart it if it fails. `yarn deploy` in a separate console will deploy the game contracts, and give
you back the url to access the client with.

## Scripts
While inside `packages/circuits`: 

`node prepareCircuit.js <circuit name>`, where `<circuit_name>` is the name of one of the circuits
in `packages/circuits/src/` but without the `.circom` extension, will compile the circuit, generate and copy the
necessary files into `static/circuits/`, and generate a solidity verifier contract in
`packages/contracts/src/dependencies/`.

`node prepareAllCircuits.js` will perform the powers of tua ceremony (if not already performed, output save in
`packages/circuits/pot/`), and then run the above command for all circom files in `packges/circuits/src/`.

## Gameplay

The 'Spawn' button in the component browser on the right can be used to spawn new units in, which can be selected by
clicking on them. Holding E will display a potential path to the cursor, and clicking will confirm that path. If you
keep holding down E after confirming the path then you can confirm the next waypoint by clicking again somewhere else.
Tapping R while holding E will switch the axis bias of the potential path. You can access the spear with W and the
search with Q.
