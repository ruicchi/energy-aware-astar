import { type Scenario, type Heading, type EnergyNode } from "../../types";
import { createEmptyEnergyBreakdown, getPathEnergyBreakdown } from "../utils";
import { MinHeap } from "./MinHeap";

const NEIGHBORS: { dr: number; dc: number; heading: Heading }[] = [
  { dr: -1, dc: 0, heading: "UP" },
  { dr: 1, dc: 0, heading: "DOWN" },
  { dr: 0, dc: -1, heading: "LEFT" },
  { dr: 0, dc: 1, heading: "RIGHT" },
];

export const runAStarManhattan = (scenario: Scenario) => {
  const [startRow, startCol] = scenario.robotNode.split("-").map(Number);
  const [destRow, destCol] = scenario.destinationNode.split("-").map(Number);

  const openSet = new MinHeap();
  const allNodes = new Map<string, EnergyNode>();
  const closedSet = new Set<string>();

  const visitedNodesInOrder: { key: string; type: "open" | "closed" }[] = [];
  const openedCells = new Set<string>();
  const closedCells = new Set<string>();

  const startNode: EnergyNode = {
    key: scenario.robotNode,
    row: startRow,
    col: startCol,
    heading: scenario.initialHeading,
    g: 0,
    h: Math.abs(startRow - destRow) + Math.abs(startCol - destCol),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.h;
  openSet.push(startNode);
  allNodes.set(startNode.key, startNode);

  // Add the start node to visited nodes so the animation starts from the robot's cell
  visitedNodesInOrder.push({ key: scenario.robotNode, type: "open" });
  openedCells.add(scenario.robotNode);

  let nodesEvaluated = 0;

  while (openSet.size() > 0) {
    const current = openSet.pop()!;

    if (closedSet.has(current.key)) continue;
    closedSet.add(current.key);
    nodesEvaluated++;

    const cellKey = current.key;

    if (current.row === destRow && current.col === destCol) {
      const shortestPath: string[] = [];
      let temp: EnergyNode | null = current;

      while (temp) {
        const pathKey = `${temp.row}-${temp.col}`;
        if (shortestPath[0] !== pathKey) {
          shortestPath.unshift(pathKey);
        }
        temp = temp.parent;
      }
      const energyBreakdown = getPathEnergyBreakdown(current, scenario);
      energyBreakdown.nodesEvaluated = nodesEvaluated;

      return {
        visitedNodesInOrder,
        shortestPath,
        totalEnergy: energyBreakdown.total,
        totalDistance: shortestPath.length - 1,
        energyBreakdown,
      };
    }

    if (cellKey !== scenario.robotNode && cellKey !== scenario.destinationNode) {
      if (!closedCells.has(cellKey)) {
        visitedNodesInOrder.push({ key: cellKey, type: "closed" });
        closedCells.add(cellKey);
      }
    }

    for (const neighbor of NEIGHBORS) {
      const nr = current.row + neighbor.dr;
      const nc = current.col + neighbor.dc;
      const neighborCellKey = `${nr}-${nc}`;
      const neighborStateKey = neighborCellKey;

      if (
        nr < 0 ||
        nr >= scenario.rows ||
        nc < 0 ||
        nc >= scenario.cols ||
        scenario.wallNodes.has(neighborCellKey) ||
        closedSet.has(neighborStateKey)
      ) {
        continue;
      }

      const stepCost = 1.0; // Manhattan is 4-way, so always 1.0
      const tentativeG = current.g + stepCost;

      let neighborNode = allNodes.get(neighborStateKey);
      if (!neighborNode || tentativeG < neighborNode.g) {
        if (!neighborNode) {
          const h = Math.abs(nr - destRow) + Math.abs(nc - destCol);
          neighborNode = {
            key: neighborStateKey,
            row: nr,
            col: nc,
            heading: neighbor.heading,
            g: tentativeG,
            h: h,
            f: tentativeG + h,
            parent: current,
          };
        } else {
          neighborNode.g = tentativeG;
          neighborNode.f = tentativeG + neighborNode.h;
          neighborNode.parent = current;
          neighborNode.heading = neighbor.heading;
        }

        allNodes.set(neighborStateKey, neighborNode);
        openSet.push({ ...neighborNode });

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

  return {
    visitedNodesInOrder,
    shortestPath: [],
    totalEnergy: 0,
    totalDistance: 0,
    energyBreakdown: createEmptyEnergyBreakdown(),
  };
};
