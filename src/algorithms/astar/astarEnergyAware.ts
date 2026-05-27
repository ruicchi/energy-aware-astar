import type { Scenario, Heading, EnergyNode } from "../../shared/types";
import {
  createEmptyEnergyBreakdown,
  getEnergyCost,
  getMinAngleToDestination,
  isTraversableSlope,
  getShortestPathData,
  markNodeVisited,
} from "../../utils/algorithmUtils.ts";
import * as MinHeap from "./MinHeap";

/**
 * Maximum translation speed of the robot.
 * Used in heuristic calculations to estimate minimum travel time.
 */
const S_MAX = 2;

/**
 * Directional vectors for 8-way movement (cardinal and diagonal directions).
 */
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

/**
 * Calculates the estimated cost from a given node to the destination.
 * Factors in distance, rotation required, and elevation changes.
 *
 * @param row - Current node row
 * @param col - Current node column
 * @param heading - Current robot heading
 * @param destRow - Destination row
 * @param destCol - Destination column
 * @param scenario - Current simulation scenario configuration
 * @returns Estimated energy/time cost (h-score)
 */
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

/**
 * Validates if a move to a neighbor is permissible.
 * Checks for boundaries, walls, previously visited states, and slope traversability.
 *
 * @param current - Current node the robot is moving from
 * @param neighbor - Neighbor offset and heading info
 * @param neighborCellKey - Unique key for the neighbor cell ("row-col")
 * @param neighborStateKey - Unique key for the neighbor state ("row-col-heading")
 * @param scenario - Current simulation scenario configuration
 * @param closedSet - Set of states already fully evaluated
 * @returns True if the move is blocked or invalid
 */
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
    // Checker for traversability
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

/**
 * Evaluates all possible neighbors of the current node.
 * Calculates energy costs, updates g-scores and f-scores, and manages the open set.
 *
 * @param current - Node currently being expanded
 * @param scenario - Current simulation scenario configuration
 * @param destRow - Destination row
 * @param destCol - Destination column
 * @param tracksHeading - Whether the algorithm should consider robot orientation
 * @param openSet - The min-priority queue of nodes to explore
 * @param allNodes - Map of all discovered node states
 * @param closedSet - Set of states already evaluated
 * @param visitedNodesInOrder - Sequence of visited nodes for animation
 * @param openedCells - Track cells that have been added to the open set
 */
const processNeighbors = (
  current: EnergyNode,
  scenario: Scenario,
  destRow: number,
  destCol: number,
  tracksHeading: boolean,
  openSet: EnergyNode[],
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

    const cost = getEnergyCost(current, { row: nr, col: nc, heading: neighbor.heading }, scenario);
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
    MinHeap.push(openSet, { ...neighborNode });

    markNodeVisited(neighborCellKey, "open", scenario, visitedNodesInOrder, openedCells);
  }
};

/**
 * Implementation of the Energy-Aware A* pathfinding algorithm.
 * Optimizes for battery consumption by factoring in distance, turns, and terrain elevation.
 * Supports both standard 8-way movement and orientation-aware movement.
 *
 * @param scenario - The complete environment and configuration for the search
 * @returns Result object containing animation sequence, shortest path, and energy metrics
 */
export const runAStarEnergyAware = (scenario: Scenario) => {
  const [destRow, destCol] = scenario.destinationNode.split("-").map(Number);
  const [startRow, startCol] = scenario.robotNode.split("-").map(Number);
  const tracksHeading = scenario.initialHeading !== "NONE";

  const openSet: EnergyNode[] = [];
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
  MinHeap.push(openSet, startNode);
  allNodes.set(startNode.key, startNode);

  visitedNodesInOrder.push({ key: scenario.robotNode, type: "open" });
  openedCells.add(scenario.robotNode);

  let nodesEvaluated = 0;

  while (openSet.length > 0) {
    const current = MinHeap.pop(openSet)!;

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
