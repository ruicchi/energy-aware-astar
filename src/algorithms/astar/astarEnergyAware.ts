import { type Scenario, type Heading, type EnergyNode } from "../../types";
import { getEnergyCost, SQRT2 } from "../utils";

const NEIGHBORS: { dr: number; dc: number; heading: Heading }[] = [
  { dr: -1, dc: 0, heading: "UP" },
  { dr: 1, dc: 0, heading: "DOWN" },
  { dr: 0, dc: -1, heading: "LEFT" },
  { dr: 0, dc: 1, heading: "RIGHT" },
  { dr: -1, dc: -1, heading: "UP_LEFT" },
  { dr: -1, dc: 1, heading: "UP_RIGHT" },
  { dr: 1, dc: -1, heading: "DOWN_LEFT" },
  { dr: 1, dc: 1, heading: "DOWN_RIGHT" },
];

class MinHeap {
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

export const runAStarEnergyAware = (scenario: Scenario) => {
  const [destRow, destCol] = scenario.destinationNode.split("-").map(Number);
  const [startRow, startCol] = scenario.robotNode.split("-").map(Number);
  const tracksHeading = scenario.initialHeading !== "NONE";

  const openSet = new MinHeap();
  const allNodes = new Map<string, EnergyNode>();
  const closedSet = new Set<string>();

  const visitedNodesInOrder: { key: string; type: "open" | "closed" }[] = [];
  const openedCells = new Set<string>();
  const closedCells = new Set<string>();

  const startNode: EnergyNode = {
    key: `${scenario.robotNode}-${scenario.initialHeading}`,
    row: startRow,
    col: startCol,
    heading: scenario.initialHeading,
    g: 0,
    h: Math.hypot(startRow - destRow, startCol - destCol),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.h
  openSet.push(startNode)
  allNodes.set(startNode.key, startNode)

  // Add the start node to visited nodes so the animation starts from the robot's cell
  visitedNodesInOrder.push({ key: scenario.robotNode, type: "open" })
  openedCells.add(scenario.robotNode)

  while (openSet.size() > 0) {
    const current = openSet.pop()!;

    // If we've already closed this state (row-col-heading), skip it
    if (closedSet.has(current.key)) continue;
    closedSet.add(current.key);

    const cellKey = `${current.row}-${current.col}`;

    if (current.row === destRow && current.col === destCol) {
      const shortestPath: string[] = [];
      let totalDistance = 0;
      let temp: EnergyNode | null = current;

      while (temp) {
        shortestPath.unshift(`${temp.row}-${temp.col}`);
        if (temp.parent) {
          const isDiagonal = temp.row !== temp.parent.row && temp.col !== temp.parent.col;
          totalDistance += isDiagonal ? SQRT2 : 1.0;
        }
        temp = temp.parent;
      }

      return {
        visitedNodesInOrder,
        shortestPath: Array.from(new Set(shortestPath)),
        totalEnergy: current.g,
        totalDistance: totalDistance,
      };
    }

    if (cellKey !== scenario.robotNode && cellKey !== scenario.destinationNode) {
      // Only record the first time a cell is closed for smoother animation
      if (!closedCells.has(cellKey)) {
        visitedNodesInOrder.push({ key: cellKey, type: "closed" });
        closedCells.add(cellKey);
      }
    }

    for (const neighbor of NEIGHBORS) {
      const nr = current.row + neighbor.dr;
      const nc = current.col + neighbor.dc;
      const neighborCellKey = `${nr}-${nc}`;
      const nodeHeading = tracksHeading ? neighbor.heading : "NONE";
      const neighborStateKey = `${neighborCellKey}-${nodeHeading}`;

      // Boundary and wall checks
      if (
        nr < 0 ||
        nr >= scenario.rows ||
        nc < 0 ||
        nc >= scenario.cols ||
        scenario.wallNodes.has(neighborCellKey) ||
        closedSet.has(neighborStateKey)
      )
        continue;

      // Strict Corner-Cutting Prevention
      if (neighbor.heading.includes("_")) {
        const cardinal1 = `${current.row + neighbor.dr}-${current.col}`;
        const cardinal2 = `${current.row}-${current.col + neighbor.dc}`;
        if (scenario.wallNodes.has(cardinal1) || scenario.wallNodes.has(cardinal2)) {
          continue;
        }
      }

      const cost = getEnergyCost(
        current,
        { row: nr, col: nc, heading: neighbor.heading },
        scenario,
      );
      const tentativeG = current.g + cost;

      let neighborNode = allNodes.get(neighborStateKey);
      if (!neighborNode || tentativeG < neighborNode.g) {
        if (!neighborNode) {
          neighborNode = {
            key: neighborStateKey,
            row: nr,
            col: nc,
            heading: nodeHeading,
            g: tentativeG,
            h: Math.hypot(nr - destRow, nc - destCol),
            f: tentativeG + Math.hypot(nr - destRow, nc - destCol),
            parent: current,
          };
        } else {
          neighborNode.g = tentativeG;
          neighborNode.f = tentativeG + neighborNode.h;
          neighborNode.parent = current;
        }

        allNodes.set(neighborStateKey, neighborNode);
        openSet.push({ ...neighborNode });

        // Only record the first time a cell is opened for smoother animation
        if (
          neighborCellKey !== scenario.robotNode &&
          neighborCellKey !== scenario.destinationNode
        ) {
          if (!openedCells.has(neighborCellKey)) {
            visitedNodesInOrder.push({ key: neighborCellKey, type: "open" });
            openedCells.add(neighborCellKey);
          }
        }
      }
    }
  }

  return { visitedNodesInOrder, shortestPath: [], totalEnergy: 0, totalDistance: 0 };
};
