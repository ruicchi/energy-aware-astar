import { type Scenario, type Heading, type EnergyNode } from "../../types";
import {
  createEmptyEnergyBreakdown,
  getSpatialCost,
  getPathEnergyBreakdown,
  SQRT2,
} from "../utils";
import { MinHeap } from "./MinHeap";

const NEIGHBORS_4: { dr: number; dc: number; heading: Heading }[] = [
  { dr: -1, dc: 0, heading: "UP" },
  { dr: 1, dc: 0, heading: "DOWN" },
  { dr: 0, dc: -1, heading: "LEFT" },
  { dr: 0, dc: 1, heading: "RIGHT" },
];

const NEIGHBORS_8: { dr: number; dc: number; heading: Heading }[] = [
  ...NEIGHBORS_4,
  { dr: -1, dc: -1, heading: "UP_LEFT" },
  { dr: -1, dc: 1, heading: "UP_RIGHT" },
  { dr: 1, dc: -1, heading: "DOWN_LEFT" },
  { dr: 1, dc: 1, heading: "DOWN_RIGHT" },
];

const manhattanDistance = (r1: number, c1: number, r2: number, c2: number) =>
  Math.abs(r1 - r2) + Math.abs(c1 - c2);
const euclideanDistance = (r1: number, c1: number, r2: number, c2: number) =>
  Math.hypot(r1 - r2, c1 - c2);
const chebyshevDistance = (r1: number, c1: number, r2: number, c2: number) =>
  Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
const octileDistance = (r1: number, c1: number, r2: number, c2: number) => {
  const dx = Math.abs(r1 - r2);
  const dy = Math.abs(c1 - c2);
  return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
};

type HeuristicType = "manhattan" | "euclidean" | "chebyshev" | "octile";

const runAStarStandard = (scenario: Scenario, heuristicType: HeuristicType) => {
  const [startRow, startCol] = scenario.robotNode.split("-").map(Number);
  const [destRow, destCol] = scenario.destinationNode.split("-").map(Number);

  let hFunc: (r1: number, c1: number, r2: number, c2: number) => number;
  let neighbors: { dr: number; dc: number; heading: Heading }[];

  switch (heuristicType) {
    case "manhattan":
      hFunc = manhattanDistance;
      neighbors = NEIGHBORS_4;
      break;
    case "euclidean":
      hFunc = euclideanDistance;
      neighbors = NEIGHBORS_8;
      break;
    case "chebyshev":
      hFunc = chebyshevDistance;
      neighbors = NEIGHBORS_8;
      break;
    case "octile":
      hFunc = octileDistance;
      neighbors = NEIGHBORS_8;
      break;
    default:
      hFunc = manhattanDistance;
      neighbors = NEIGHBORS_4;
  }

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
    h: hFunc(startRow, startCol, destRow, destCol),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.h;
  openSet.push(startNode);
  allNodes.set(startNode.key, startNode);

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
      const energyBreakdown = getPathEnergyBreakdown(current, scenario);
      energyBreakdown.nodesEvaluated = nodesEvaluated;

      return {
        visitedNodesInOrder,
        shortestPath: Array.from(new Set(shortestPath)),
        totalEnergy: energyBreakdown.total,
        totalDistance: totalDistance,
        energyBreakdown,
      };
    }

    if (cellKey !== scenario.robotNode && cellKey !== scenario.destinationNode) {
      if (!closedCells.has(cellKey)) {
        visitedNodesInOrder.push({ key: cellKey, type: "closed" });
        closedCells.add(cellKey);
      }
    }

    for (const neighbor of neighbors) {
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

      // Corner-cutting prevention
      if (neighbor.heading.includes("_")) {
        const cardinal1 = `${current.row + neighbor.dr}-${current.col}`;
        const cardinal2 = `${current.row}-${current.col + neighbor.dc}`;
        if (scenario.wallNodes.has(cardinal1) || scenario.wallNodes.has(cardinal2)) {
          continue;
        }
      }

      const stepCost = getSpatialCost({ heading: neighbor.heading });
      const tentativeG = current.g + stepCost;

      let neighborNode = allNodes.get(neighborStateKey);
      if (!neighborNode || tentativeG < neighborNode.g) {
        if (!neighborNode) {
          const h = Math.hypot(nr - destRow, nc - destCol);
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

// Wrapper functions that act as adapters for your GameGrid
export const runAStarManhattan = (scenario: Scenario) => runAStarStandard(scenario, "manhattan");
export const runAStarEuclidean = (scenario: Scenario) => runAStarStandard(scenario, "euclidean");
export const runAStarChebyshev = (scenario: Scenario) => runAStarStandard(scenario, "chebyshev");
export const runAStarOctile = (scenario: Scenario) => runAStarStandard(scenario, "octile");
