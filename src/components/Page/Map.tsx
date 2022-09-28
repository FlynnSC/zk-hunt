import React, {MouseEventHandler, useEffect, useState} from 'react';
import styled from 'styled-components';
import {produce} from '../../utils';
import {action} from 'mobx';
import {useKeyboardListener} from '../../hooks';
import {useAccount, useContractEvent, useSigner} from 'wagmi';
import {createProver} from '../../zkUtils';
import {ZKHunt} from '../../../typechain-types';
import {ethers} from 'ethers';
import ZKHuntData from '../../artifacts/contracts/ZKHunt.sol/ZKHunt.json';
import {awaitTx} from '../../ethUtils';

export const MAP_SIZE = 15;
const MAX_TILE_COUNT = MAP_SIZE * MAP_SIZE;
const ONE = BigInt(1);
const initialMapData = BigInt('50597415194156383107811953127686760639719540491578513092925855760412');

const jungleEnterProver = createProver('jungleEnter', true);
const jungleMoveProver = createProver('jungleMove', true);
const contractConfig = {
  addressOrName: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  // addressOrName: '0x9A676e781A523b5d0C0e43731313A708CB607508',
  // addressOrName: '0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9',
  contractInterface: ZKHuntData.abi,
};
let zkHuntContract = new ethers.Contract(contractConfig.addressOrName, contractConfig.contractInterface) as ZKHunt;

enum TileType {
  PLAINS,
  JUNGLE,
}

const posToIndex = (pos: {x: number, y: number}) => pos.x + MAP_SIZE * pos.y;

export const Map = () => {
  const [playerChar, setPlayerChar] = useState('');
  const {data: signer} = useSigner();
  const {address: tempVar} = useAccount();
  const playerAddress = tempVar as string;
  const [mapData, setMapData] = useState(initialMapData);
  const [playerPos, setPlayerPos] = useState({x: 0, y: 0});
  const [targetPos, setTargetPos] = useState(playerPos);
  const [otherPlayerAddress, setOtherPlayerAddress] = useState('');
  const [otherPlayerChar, setOtherPlayerChar] = useState('');
  const [otherPlayerPos, setOtherPlayerPos] = useState<{x: number, y: number} | null>(null);
  const [potentialPlayerPosSet, setPotentialPlayerPosSet] = useState<Record<string, boolean>>({});

  const getMapTileType = (position: {x: number, y: number} | number): TileType => (
    Number((mapData >> BigInt(typeof position === 'number' ? position : posToIndex(position))) & ONE)
  );

  // Initial setup
  useEffect(() => {
    if (signer && playerAddress) {
      zkHuntContract = zkHuntContract.connect(signer);
      zkHuntContract.playersActive(playerAddress).then(isActive => {
        if (!isActive) {
          zkHuntContract.activatePlayer(playerAddress);
        } else {
          zkHuntContract.playerKnownPositions(playerAddress).then(position => {
            const parsedPosition = {x: position.x, y: position.y};
            setPlayerPos(parsedPosition);
            setTargetPos(parsedPosition);
          });
        }
      });
      zkHuntContract.mapData().then(contractMapData => {
        if (contractMapData.isZero()) {
          zkHuntContract.setMapData(mapData);
        }
      });
      setPlayerChar(playerAddress.slice(2, 3).toUpperCase());
    }
  }, [signer, playerAddress]);

  // Other player setup
  useContractEvent({
    ...contractConfig, eventName: 'PlayerActivated', listener: event => {
      const address = event[0];
      if (address !== playerAddress) {
        setOtherPlayerAddress(address);
        setOtherPlayerChar(address.slice(2, 3).toUpperCase());
        zkHuntContract.playerKnownPositions(address).then(position => {
          setOtherPlayerPos({x: position.x, y: position.y});
        });
      }
    }
  });

  useContractEvent({
    ...contractConfig, eventName: 'PlayerPlainsMove', listener: event => {
      if (event[0] === otherPlayerAddress) {
        setOtherPlayerPos(event[1]);
      }
    }
  });

  useContractEvent({
    ...contractConfig, eventName: 'PlayerJungleEnter', listener: event => {
      if (event[0] === otherPlayerAddress) {
        setOtherPlayerPos(null);
        setPotentialPlayerPosSet({[posToIndex(event[1])]: true});
      }
    }
  });

  useContractEvent({
    ...contractConfig, eventName: 'PlayerJungleMove', listener: event => {
      if (event[0] === otherPlayerAddress) {
        const newPotentialPlayerPosSet = Object.keys(potentialPlayerPosSet).reduce((positionSet, index) => {
          positionSet[index] = true;
          [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([deltaX, deltaY]) => {
            const checkIndex = parseInt(index) + deltaX + MAP_SIZE * deltaY;
            if (checkIndex >= 0 && checkIndex < MAX_TILE_COUNT && getMapTileType(checkIndex) === TileType.JUNGLE) {
              positionSet[checkIndex] = true;
            }
          });
          return positionSet;
        }, {} as Record<string, boolean>);
        setPotentialPlayerPosSet(newPotentialPlayerPosSet);
      }
    }
  });

  useContractEvent({
    ...contractConfig, eventName: 'PlayerJungleExit', listener: event => {
      if (event[0] === otherPlayerAddress) {
        setOtherPlayerPos(event[1]);
        setPotentialPlayerPosSet({});
      }
    }
  });

  // Input handling
  useKeyboardListener(e => {
    switch (e.key) {
      case 'd':
        setTargetPos(oldPos => ({...oldPos, x: oldPos.x + 1}));
        break;
      case 'a':
        setTargetPos(oldPos => ({...oldPos, x: oldPos.x - 1}));
        break;
      case 'w':
        setTargetPos(oldPos => ({...oldPos, y: oldPos.y - 1}));
        break;
      case 's':
        setTargetPos(oldPos => ({...oldPos, y: oldPos.y + 1}));
        break;
    }
  });

  // Contract interaction in response to input
  const updateFn = async () => {
    const nonce = parseInt(localStorage.getItem('nonce') || '0');
    const currentTileType = getMapTileType(playerPos);
    const targetTileType = getMapTileType(targetPos);
    if (currentTileType === TileType.PLAINS) {
      if (targetTileType === TileType.PLAINS) {
        await awaitTx(zkHuntContract.plainsMove(playerAddress, targetPos));
        setPlayerPos(targetPos);
      } else {
        const {proofData, publicSignals} = await jungleEnterProver({...targetPos, nonce});
        await awaitTx(zkHuntContract.jungleEnter(
          playerAddress,
          targetPos,
          publicSignals[0],
          proofData
        ));
        setPlayerPos(targetPos);
      }
    } else if (targetTileType === TileType.PLAINS) {
      await awaitTx(zkHuntContract.jungleExit(playerAddress, playerPos, nonce, targetPos));
      setPlayerPos(targetPos);
    } else {
      const {proofData, publicSignals} = await jungleMoveProver({
        oldX: playerPos.x, oldY: playerPos.y, oldNonce: nonce,
        newX: targetPos.x, newY: targetPos.y, mapData,
      });
      await awaitTx(zkHuntContract.jungleMove(
        playerAddress,
        publicSignals[1],
        proofData
      ));
      setPlayerPos(targetPos);
      localStorage.setItem('nonce', (nonce + 1).toString());
    }
  };
  useEffect(() => {
    if (targetPos !== playerPos) {
      updateFn();
    }
  }, [targetPos]);

  return (
    <div>
      <Grid onContextMenu={e => e.preventDefault()}>
        {produce(MAP_SIZE * MAP_SIZE, bitIndex => {
          const shift = BigInt(bitIndex);
          const isForest = !!(mapData & (ONE << shift));

          const onClick: MouseEventHandler<HTMLDivElement> = action(e => {
            const mask = ONE << shift;
            if (e.buttons === 1) {
              setMapData(mapData | mask);
            } else if (e.buttons === 2) {
              setMapData(mapData & ~mask);
            }
          });

          const hasPlayer = posToIndex(playerPos) === bitIndex;
          const hasTarget = posToIndex(targetPos) === bitIndex;
          const hasOtherPlayer = otherPlayerPos && posToIndex(otherPlayerPos) === bitIndex;
          const content = hasPlayer ? playerChar : (hasTarget ? 'X' : (
            hasOtherPlayer ? otherPlayerChar : (potentialPlayerPosSet[bitIndex] ? '?' : undefined)
          ));

          return (
            <Pixel
              key={bitIndex}
              style={{backgroundColor: isForest ? 'green' : 'sandybrown'}}
              draggable={false}
              onMouseDown={onClick}
            >
              <HighlightOverlay>{content}</HighlightOverlay>
            </Pixel>
          );
        })}
      </Grid>
    </div>
  );
};

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${MAP_SIZE}, 1fr);
  grid-template-rows: repeat(${MAP_SIZE}, 1fr);
  width: 40rem;
  aspect-ratio: 1/1;
  overflow: hidden;
`;

const Pixel = styled.div`
  cursor: crosshair;
`;

const HighlightOverlay = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: black;
  font-size: 2rem;

  &:hover {
    background-color: rgba(128, 128, 128, 0.6);
  }
`;
