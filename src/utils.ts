export function produce<T>(count: number, producerFn: (index: number) => T) {
  return Array(count).fill(0).map((_, index) => producerFn(index));
}
