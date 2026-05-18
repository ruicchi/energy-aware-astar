import { type EnergyNode } from "../../types";

// NOTE: this organizes nodes so that the best node is always evaluated first
export class MinHeap {
  private heap: EnergyNode[] = [];

  push(node: EnergyNode) {
    this.heap.push(node);
    this.bubbleUp();
  }

  pop(): EnergyNode | undefined {
    if (this.size() === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.size() > 0) {
      this.heap[0] = bottom;
      this.bubbleDown();
    }
    return top;
  }

  size() {
    return this.heap.length;
  }

  private shouldSwap(childIndex: number, parentIndex: number): boolean {
    const child = this.heap[childIndex];
    const parent = this.heap[parentIndex];
    if (child.f < parent.f) return true;
    if (child.f === parent.f) return child.h < parent.h;
    return false;
  }

  private bubbleUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (!this.shouldSwap(index, parentIndex)) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  private bubbleDown() {
    let index = 0;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < this.heap.length && this.shouldSwap(left, smallest)) smallest = left;
      if (right < this.heap.length && this.shouldSwap(right, smallest)) smallest = right;

      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}
