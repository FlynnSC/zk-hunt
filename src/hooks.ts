import {useEffect, useState} from 'react';

export const useTimer = (until: Date) => {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((until.getTime() - Date.now()) / 1000)));

  useEffect(() => {
    const msLeft = until.getTime() - Date.now();
    if (msLeft > 0) {
      // Ensures that if msLeft % 1000 === 0, then a full second is still passed
      const timeoutMs = (msLeft % 1000) || 1000;
      const timeoutHandle = setTimeout(() => setSecondsLeft(secondsLeft - 1), timeoutMs);
      return () => clearTimeout(timeoutHandle);
    }
  }, [until, secondsLeft]);

  return secondsLeft;
};

export const useOnMount = (callback: () => void) => useEffect(callback, []);

export const useOnUnmount = (callback: () => void) => useEffect(() => callback, []);

export const useOnMountUnmount = (onMount: () => void, onUnmount: () => void) => useEffect(() => {
  onMount();
  return onUnmount;
}, []);

// Assumes the callback never changes (functionally)
export const useKeyboardListener = (listener: (e: KeyboardEvent) => void) => {
  useEffect(() => {
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);
};
