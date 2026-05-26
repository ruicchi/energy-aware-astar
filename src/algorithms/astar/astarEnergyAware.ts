import { type Scenario, type Heading, type EnergyNode } from "../../shared/types";
import {
  createEmptyEnergyBreakdown,
  getEnergyCost,
  getMinAngleToDestination,
  getPathEnergyBreakdown,
  isTraversableSlope,
  SQRT2,
} from "../utils";
import { MinHeap } from "./MinHeap";

const S_MAX = 2; // Maximum translation speed

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

const calculateHeuristic = (
  row: number,
  col: number,
  heading: Heading,
  destRow: number,
  destCol: number,
  scenario: Scenario,
): number => {
  const distance = Math.hypot(row - destRow, col - destCol);
  const hTrans = distance / S_MAX;
  const minAngle = getMinAngleToDestination(heading, row, col, destRow, destCol);
  const hRot = scenario.turnPenalty * minAngle;

  // Elevation-Aware Heuristic: Predict energy cost to climb to destination
  const currentElevation = scenario.elevations.get(`${row}-${col}`) || 0;
  const destElevation = scenario.elevations.get(scenario.destinationNode) || 0;
  const elevationDelta = destElevation - currentElevation;
  // Only penalize if destination is higher (Anisotropic)
  const hElev = elevationDelta > 0 ? elevationDelta * scenario.climbingFactor : 0;

  return hTrans + hRot + hElev;
};

const getShortestPathData = (current: EnergyNode, scenario: Scenario, nodesEvaluated: number) => {
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
    shortestPath: Array.from(new Set(shortestPath)),
    totalEnergy: energyBreakdown.total,
    totalDistance,
    energyBreakdown,
  };
};

const isInvalidMove = (
  current: EnergyNode,
  neighbor: { dr: number; dc: number; heading: Heading },
  neighborCellKey: string,
  neighborStateKey: string,
  scenario: Scenario,
  closedSet: Set<string>,
) => {
  const nr = current.row + neighbor.dr;
  const nc = current.col + neighbor.dc;

  // Boundary and wall checks
  if (
    nr < 0 ||
    nr >= scenario.rows ||
    nc < 0 ||
    nc >= scenario.cols ||
    scenario.wallNodes.has(neighborCellKey) ||
    closedSet.has(neighborStateKey) ||
    !isTraversableSlope(current, { row: nr, col: nc, heading: neighbor.heading }, scenario)
  ) {
    return true;
  }

  // Strict Corner-Cutting Prevention
  if (neighbor.heading.includes("_")) {
    const cardinal1 = `${current.row + neighbor.dr}-${current.col}`;
    const cardinal2 = `${current.row}-${current.col + neighbor.dc}`;
    if (scenario.wallNodes.has(cardinal1) || scenario.wallNodes.has(cardinal2)) {
      return true;
    }
  }

  return false;
};

const markNodeVisited = (
  key: string,
  type: "open" | "closed",
  scenario: Scenario,
  visitedNodesInOrder: { key: string; type: "open" | "closed" }[],
  trackedCells: Set<string>,
) => {
  const isSpecial = key === scenario.robotNode || key === scenario.destinationNode;
  if (!isSpecial && !trackedCells.has(key)) {
    visitedNodesInOrder.push({ key, type });
    trackedCells.add(key);
  }
};

const processNeighbors = (
  current: EnergyNode,
  scenario: Scenario,
  destRow: number,
  destCol: number,
  tracksHeading: boolean,
  openSet: MinHeap,
  allNodes: Map<string, EnergyNode>,
  closedSet: Set<string>,
  visitedNodesInOrder: { key: string; type: "open" | "closed" }[],
  openedCells: Set<string>,
) => {
  for (const neighbor of NEIGHBORS) {
    const nr = current.row + neighbor.dr;
    const nc = current.col + neighbor.dc;
    const neighborCellKey = `${nr}-${nc}`;
    const nodeHeading = tracksHeading ? neighbor.heading : "NONE";
    const neighborStateKey = `${neighborCellKey}-${nodeHeading}`;

    if (isInvalidMove(current, neighbor, neighborCellKey, neighborStateKey, scenario, closedSet)) {
      continue;
    }

    const cost = getEnergyCost(
      current,
      { row: nr, col: nc, heading: neighbor.heading },
      scenario,
    );
    const tentativeG = current.g + cost;

    let neighborNode = allNodes.get(neighborStateKey);
    if (neighborNode && tentativeG >= neighborNode.g) continue;

    if (!neighborNode) {
      const h = calculateHeuristic(nr, nc, nodeHeading, destRow, destCol, scenario);
      neighborNode = {
        key: neighborStateKey,
        row: nr,
        col: nc,
        heading: nodeHeading,
        g: tentativeG,
        h: h,
        f: tentativeG + h,
        parent: current,
      };
    } else {
      neighborNode.g = tentativeG;
      neighborNode.f = tentativeG + neighborNode.h;
      neighborNode.parent = current;
    }

    allNodes.set(neighborStateKey, neighborNode);
    openSet.push({ ...neighborNode });

    markNodeVisited(neighborCellKey, "open", scenario, visitedNodesInOrder, openedCells);
  }
};

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
    h: calculateHeuristic(startRow, startCol, scenario.initialHeading, destRow, destCol, scenario),
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

    const cellKey = `${current.row}-${current.col}`;

    if (current.row === destRow && current.col === destCol) {
      return {
        visitedNodesInOrder,
        ...getShortestPathData(current, scenario, nodesEvaluated),
      };
    }

    markNodeVisited(cellKey, "closed", scenario, visitedNodesInOrder, closedCells);

    processNeighbors(
      current,
      scenario,
      destRow,
      destCol,
      tracksHeading,
      openSet,
      allNodes,
      closedSet,
      visitedNodesInOrder,
      openedCells,
    );
  }

  return {
    visitedNodesInOrder,
    shortestPath: [],
    totalEnergy: 0,
    totalDistance: 0,
    energyBreakdown: createEmptyEnergyBreakdown(),
  };
};
