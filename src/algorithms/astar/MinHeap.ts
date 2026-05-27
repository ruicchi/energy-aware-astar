import { type EnergyNode } from "../../shared/types";

export const push = (heap: EnergyNode[], node: EnergyNode) => {
  heap.push(node);
  bubbleUp(heap);
};

export const pop = (heap: EnergyNode[]): EnergyNode | undefined => {
  if (heap.length === 0) return undefined;
  const top = heap[0];
  const bottom = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = bottom;
    bubbleDown(heap);
  }
  return top;
};

const shouldSwap = (heap: EnergyNode[], childIndex: number, parentIndex: number): boolean => {
  const child = heap[childIndex];
  const parent = heap[parentIndex];
  if (child.f < parent.f) return true;
  if (child.f === parent.f) return child.h < parent.h;
  return false;
};

const bubbleUp = (heap: EnergyNode[]) => {
  let index = heap.length - 1;
  while (index > 0) {
    const parentIndex = Math.floor((index - 1) / 2);
    if (!shouldSwap(heap, index, parentIndex)) break;
    [heap[index], heap[parentIndex]] = [heap[parentIndex], heap[index]];
    index = parentIndex;
  }
};

const bubbleDown = (heap: EnergyNode[]) => {
  let index = 0;
  while (true) {
    let smallest = index;
    const left = 2 * index + 1;
    const right = 2 * index + 2;

    if (left < heap.length && shouldSwap(heap, left, smallest)) smallest = left;
    if (right < heap.length && shouldSwap(heap, right, smallest)) smallest = right;

    if (smallest === index) break;
    [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
    index = smallest;
  }
};
