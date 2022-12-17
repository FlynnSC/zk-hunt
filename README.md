# ZK Hunt

ZK Hunt is a prototype for an onchain game built on [mud](https://mud.dev), which explores different ZK game mechanics
and information asymmetry. It is still very much a WIP, and has many TODOs to clean up :).

## Getting started

You will need rust, which is required for both foundry and circom, installation instructions
[here](https://www.rust-lang.org/tools/install).

You will need foundry, installation instructions [here](https://github.com/foundry-rs/foundry), I recommend using the
'Installing from Source' approach.

You will need circom and snarkjs, installation instructions [here](https://docs.circom.io/getting-started/installation/)
.

Run `yarn` to install all dependencies. If you run into a weird error about `remote-ls` failing, then try running
`git config --global url."https://".insteadOf git://`, and then running `yarn` again.

`yarn start` will start both the local anvil node and the client. `yarn deploy` will deploy the game contracts, and give
you back the url to access the client with.

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

# Explanation

## Context

So onchain/autonomous worlds clearly have definitive value and promise, but at least right now, there are some
affordances that we take for granted in traditional games and digital worlds, which we lose when building autonomous
worlds, due to the inherent public nature of the blockchain.

What are some of the affordance that we lose? The ones I’ll focus on here revolve around private state and information
asymmetry. Some examples are the fog of war that you might find in a traditional strategy game, or the bushes in league
of legends, or how about just a basic corner in a first person shooter? I can see what directly in front of me, but I
cannot see what is around the corner because there is a wall in the way. Or what about just the ability to sneak up on
someone from behind?

These simple mechanics are trivial to implement when you have a single server that stores all the private state, and
determines what players can and cannot see, but on the blockchain achieving these things is actually quite difficult.
And so ZK Hunt is my attempt at bringing back some of those affordances, with the help of some cool cryptographic
primitives.

## Jungle/plains movement

So the following video shows two players, player A on the left and player B on the right. Each player controls one unit,
highlighted with the white outline, and can see the other player’s unit, colored red to show that they’re an enemy.

[![Plains/jungle movement demo](https://img.youtube.com/vi/nDow8DArsRo/maxresdefault.jpg)](https://www.youtube.com/watch?v=nDow8DArsRo)

In this world we have two types of tiles; plains tiles shown with grass, and jungle tiles shown with trees. Movement
across the plains is public, and so each move is a transaction that submits your new position to the contract, which
verifies that it was a valid move (a single orthogonal step). This means that everyone can see your exact position in
the plains.

However, once you enter the jungle, you now also submit a commitment to your position, which is the poseidon hash of
your new (x, y) coordinates, and some secret nonce that you keep private. This commitment is also accompanied with a ZK
proof that you in fact do know the secret nonce that when hashed with the (x, y) coordinates results in the submitted
commitment, so that you can’t submit a commitment that doesn’t correspond to your (x, y).

This means that everyone can see the tile that you entered the jungle through, but now, when you move from one jungle
tile to another, you don't submit your new position, only a new commitment to your position, along with a zk proof that
verifies the validity of the move. This proof verifies that

1. The different between the position corresponding to the old commitment and the position corresponding to the new
   commitment, is only a single step in an orthogonal direction (no diagonal movement).
2. That the new tile that you have moved into is a jungle tile. This is determined by checking a bitwise representation
   of the map, which is bit packed into field elements and merklised to that there are fewer public inputs to the
   circuit.

Since you don’t submit your actual new position, all other players don’t actually know which tile you moved into, only
that you have made *some* move. This is shown by the question marks, from player A’s perspective representing the set of
potential positions that you could be in. Making more moves through the jungle increases the size of this ambiguity, in
a flood fill fashion.

In order to exit the jungle back into the plains, you have to reveal your current position in the jungle, so that the
contract can verify that the move from the jungle tile to the plains tiles is valid. This is done by submitting your
private position and the secret nonce, and the contract confirms that their hash matches the stored commitment. This
causes the ambiguity to collapse, and or all other players to learn of your position.

## Spear

Once a player has some ambiguity inside the jungle, how do other players interact with them? For that, we have the
spear. The spear is a linear set of four hit tiles that extend out from the player, which we can aim in any direction.
To showcase this we’ll also bring in a third player, player C, in the bottom right. Player C doesn’t control any units,
they are just a third part observer.

[![Spear demo](https://img.youtube.com/vi/Ky6czwFZm_I/maxresdefault.jpg)](https://www.youtube.com/watch?v=Ky6czwFZm_I)

This linear arrangement of 4 hit tiles is actually arbitrary, we could have any kind of arrangement of any number of hit
tiles. You can use this to create a club which utilises a smaller arc of hit tiles, or maybe a bomb that produces a
larger circular region of hit tiles, further away from the player that threw it.

These hit tiles go through 3 stages:

1. Potential (shown in translucent white): when the player is still aiming the spear.
2. Pending (shown in solid white): the player has confirmed the direction and submitted the hit tiles to the contract.
3. Resolved (shown in red): the contract has determined whether the hit tiles have hit anything or not. Hit tiles are
   resolved on a tile-by-tile basis, as some tiles may resolve before others.

In the video above you see player A throw a spear at one of player B’s units in the plains, resulting in them being
killed and dropping their loot. The spear is also thrown at player B’s unit in the jungle without player A knowing
exactly where they are. The first attempt misses, and player B maintains the ambiguity of their position, but the second
attempt hits, resulting in their position being revealed, they die and drop their loot.

But wait a second, how does player A know whether they hit player B or not, if they don’t even know player B’s position,
and neither does the contract? The answer is that we force player B to reveal whether they were hit or not.

Let’s rewind. When entering the game, each player puts down a deposit in order to play. If they are killed in the game,
then they drop a small portion of this deposit as loot for other players to pick up, and get the rest back. During the
game however, we can use the presence of this deposit, and the threat of slashing, to ensure that players interact with
the system in the correct way. It’s not a cryptographic guarantee, it’s a financial guarantee.

Now back to the spear. When player A throws the spear into the jungle, they create a ‘potential hit’ on Player B. Player
B has three options:

1. They weren’t hit, in which case they generate a ZK proof showing that fact, which they submit to the contract, and in
   doing so maintain the ambiguity of their position. That’s what you saw the happen in the first attempt.
2. They were hit, in which case they can’t generate such a proof, so they publish their position, take the hit and drop
   their loot. That’s what you saw happen in the second attempt.
3. They were hit and can’t generate the proof, but they just don’t respond at all. Attached to the potential hit is a
   finite response period, and if Player A doesn’t respond within that time, then their full deposit gets slashed and
   killed anyway. The rules of the game are enforced.

I like to think of the spear as a method for ‘forced information reveal’, and the presence of the slashable deposit
creating ‘forced interactivity’. This construction allows Player A to, in a sense, interact directly with player B’s
private state.

[![Spear from within the jungle demo](https://img.youtube.com/vi/-it747N9gRg/maxresdefault.jpg)](https://www.youtube.com/watch?v=-it747N9gRg)

The spear can also be thrown from within the jungle, while the player has positional ambiguity. Doing so forces the
player to reveal their position, so that the contract can verify where the hit tiles should coming from, but since
they’re already in the jungle, the player can immediately fade back into the jungle and regain that ambiguity.

An important thing to note is that forcing a player to reveal their location in the jungle by throwing a spear at them
is public information reveal; when player A is hit, all players learn of their position. Can we do better than this, can
we do private information reveal?

## Search

Enter, the search ability. Although it uses the same linear construction of hit tiles, or in this case ‘challenge
tiles’, the search isn’t a combat ability, but rather than information gathering one.

[![Search demo](https://img.youtube.com/vi/JOYCsQUqaWM/maxresdefault.jpg)](https://www.youtube.com/watch?v=JOYCsQUqaWM)

So here we see player A search for player B, miss and learn nothing. They try again, the search lands on player B, and
they their position is revealed

This is the same thing that you just saw with the spear, except without the death, but in this case only player A learnt
of player B’s position, and player C learnt nothing. In fact not only did they not learn of their position, player C
doesn’t even know if player A was successful in their search or not. This is private player discovery, this is private
information reveal.

So how does this work? When player B sees that they have had a ‘pending challenge’ placed on them (similar to the
‘potential hit’ that the spear creates), rather than submitting their position directly to the contract, they encrypt
their position* such that only player A can decrypt it, and then post the ciphertext alongside a proof that the
encryption was done correctly.

When originally thinking of this mechanic, I started looking for encryption schemes that could be verified in a
snark-friendly way, and then realised that the [Dark Forest Nightmarket plugin](https://blog.zkga.me/nightmarket) had
already solved this exact problem. I ended up reusing some of the key derivation and poseidon cipher circuits from
Nightmarket, which itself had made changes to some of the circuits
from [maci](https://github.com/privacy-scaling-explorations/maci)
and [this circomlib pr by Koh Wei Jei](https://github.com/iden3/circomlib/pull/60).

The poseidon cipher is used as the symmetric encryption scheme, as it is much more snark friendly than traditional
asymmetric encryption schemes. The shared key for a particular scheme is established using an
‘offline’ [ECDH key exchange](https://en.wikipedia.org/wiki/Elliptic-curve_Diffie%E2%80%93Hellman). Practically, this
means that when entering the game all players establish a private key/public key pair, submit their public keys to the
contract, and then all players can now calculate locally what the shared key would be for any communication with any
other player. Use of the correct key is enforced in the proof that validates the encryption was done correctly.

*Technically they encrypt the secret nonce that is used in the position commitment, because revealing this nonce allows
you to trivially determine what the corresponding position is, by simply doing a small brute force search of which
position when combined with the revealed nonce would result in the commitment stored onchain.

If player B wasn’t hit by the search, then instead of encrypting their position they encrypt junk, which the circuit
accepts if they can show their position wasn’t included in the challenge tiles. This allows them to maintain the
ambiguity of their position from player A’s perspective, but from player C’s perspective they cannot tell whether the
search was successful or not because they see a ciphertext submitted either way.

A search can also be performed from within the jungle, which brings different affordances, and more cryptographic
complexity.

[![Search from within the jungle demo](https://img.youtube.com/vi/b7phoELpnGs/maxresdefault.jpg)](https://www.youtube.com/watch?v=b7phoELpnGs)

So here, both player A and player B go into the jungle, and player C doesn't know where either of them are. Again,
Player A is going to search for player B, and this time round they’re immediately lucky. For the third time, we see that
player B’s position is revealed to player A, but if we look down at player C, they have learnt almost nothing.

Unlike throwing a spear from the jungle, which revealed your position and the hit tiles to all players, performing a
search from within the jungle reveals neither (except to the player you’re searching for). Like the search from outside
jungle, player C doesn't learn of player B’s position, nor whether player A was successful in their search or not.

In fact, they know that Player A performed a search, and player B submitted a response, but they actually can’t
determine whether there was a definitive causal link between the two. They can infer that there is a link, due to the
temporal closeness of the challenge and the response, but if there were many challenges and responses within a short
period of time, then they would not be able to make links between them. This is maximally private player interaction.

So how does this work? Well it’s similar to the search outside of the jungle, but this time the challenge tiles
submitted by player A are also encrypted with the shared key, which is what allows player A to submit a challenge
without revealing their position or the challenge tiles to any other players. This challenge is then submitted without
nominating which player it’s actually challenging (the first part of preventing a connection being made between the
challenger and the responder), all other players attempt to decrypt it, and if the decryption was successful then they
know the challenge was for them.

The player B then responds in the same way as they did for the search outside the jungle, but in this case without
referencing the pending challenge that was created on them by player A, because there is none, nor do they reference the
challenge ciphertext that player A submitted (the second part of preventing a connection being made between the
challenger and the responder).

So if the proof of correct encryption that player B submits along with their response doesn’t refer to player A’s public
key, how can we actually be sure they’ve encrypted it such that player A can decrypt it? Well, we can just rely on
player A to slash player B if they don’t provide a response that they can decrypt within the finite response period. To
enable this, the last N responses from player B are stored onchain in a queue, and player A can make a proof that shows
that none of those responses is correct with respect to the original challenge ciphertext that they submitted.

Storing the last N responses for all players onchain is expensive though, because each response ciphertext is 4
uint256’s, and so instead a more efficient nullifier scheme is used. When player A submits their challenge, an implicit
nullifier is generated, which takes the form of:

`poseidon(challengeTilesMerkleChainRoot, challengedPlayer, sharedKey[0], nullifierNonce)`

Where:

- `challengeTilesMerkleChainRoot` is the root of the merklisation of the challenge tiles (as a chain rather than a tree)
  . This binds the challenge to a particular set of tiles.
- `challengedPlayer` is the entity id of the player being challenged (the uint256 id is converted to a field element by
  bit masking it with 2^253 - 1). This binds the challenge to a particular entity.
- `sharedKey[0]` is the first part of the shared key. This binds the challenge to a specific shared key that will be
  used to encrypt the challenge and response.
- `nullifierNonce` is a random value generated for this challenge. This ensures that multiple challenges on the same
  entity, with the same set of challenge tiles, that would use the same shared key, still result in unique nullifiers.

However, player A doesn’t submit this nullifier when creating the challenge, rather player B submits the nullifier when
providing their response, and it’s this submission of the nullifier that signals that they have responded. If the
correct nullifier hasn’t been submitted by player B within the response period, then player A can slash them.

The generation of the nullifier is checked in the proof that player B supplied with their response, and so the only way
for player B to generate the correct nullifier, such that player A cannot slash them, is to provide a response which
refers to the correct set of challenge tiles, the correct challenged player, encrypted with the correct shared key.

Nullifiers that are submitted are still stored in a queue, but it is a universal queue for all players.

## Conclusion

ZK Hunt started as an attempt at making a game, based on the single mechanic of the jungle/plains movement, but as more
mechanics were added, it really ended up as just a medium for testing out these different constructions. I think there
is a lot more exploration to be done in this area.
