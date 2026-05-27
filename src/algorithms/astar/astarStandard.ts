import type { Scenario, Heading, EnergyNode } from "../../shared/types";
import {
  createEmptyEnergyBreakdown,
  getSpatialCost,
  SQRT2,
  getShortestPathData,
  markNodeVisited,
} from "../utils";
import * as MinHeap from "./MinHeap";

/**
 * Directional vectors for 4-way movement (cardinal directions only).
 */
const NEIGHBORS_4: { dr: number; dc: number; heading: Heading }[] = [
  { dr: -1, dc: 0, heading: "UP" },
  { dr: 1, dc: 0, heading: "DOWN" },
  { dr: 0, dc: -1, heading: "LEFT" },
  { dr: 0, dc: 1, heading: "RIGHT" },
];

/**
 * Directional vectors for 8-way movement (cardinal and diagonal directions).
 */
const NEIGHBORS_8: { dr: number; dc: number; heading: Heading }[] = [
  ...NEIGHBORS_4,
  { dr: -1, dc: -1, heading: "UP_LEFT" },
  { dr: -1, dc: 1, heading: "UP_RIGHT" },
  { dr: 1, dc: -1, heading: "DOWN_LEFT" },
  { dr: 1, dc: 1, heading: "DOWN_RIGHT" },
];

/**
 * Calculates Manhattan distance between two points.
 * Suitable for 4-way movement.
 */
const manhattanDistance = (r1: number, c1: number, r2: number, c2: number) =>
  Math.abs(r1 - r2) + Math.abs(c1 - c2);

/**
 * Calculates Euclidean distance between two points.
 * Represents the straight-line distance.
 */
const euclideanDistance = (r1: number, c1: number, r2: number, c2: number) =>
  Math.hypot(r1 - r2, c1 - c2);

/**
 * Calculates Chebyshev distance between two points.
 * Suitable for 8-way movement where diagonal moves cost the same as cardinal moves.
 */
const chebyshevDistance = (r1: number, c1: number, r2: number, c2: number) =>
  Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));

/**
 * Calculates Octile distance between two points.
 * Suitable for 8-way movement where diagonal moves cost SQRT(2).
 */
const octileDistance = (r1: number, c1: number, r2: number, c2: number) => {
  const dx = Math.abs(r1 - r2);
  const dy = Math.abs(c1 - c2);
  return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
};

/**
 * Supported heuristic types for the standard A* algorithm.
 */
type HeuristicType = "manhattan" | "euclidean" | "chebyshev" | "octile";

/**
 * Retrieves the appropriate heuristic function and neighbor set for a given heuristic type.
 *
 * @param heuristicType - The desired heuristic metric
 * @returns Object containing the heuristic function and compatible neighbors
 */
const getHeuristicData = (heuristicType: HeuristicType) => {
  switch (heuristicType) {
    case "euclidean":
      return { hFunc: euclideanDistance, neighbors: NEIGHBORS_8 };
    case "chebyshev":
      return { hFunc: chebyshevDistance, neighbors: NEIGHBORS_8 };
    case "octile":
      return { hFunc: octileDistance, neighbors: NEIGHBORS_8 };
    case "manhattan":
    default:
      return { hFunc: manhattanDistance, neighbors: NEIGHBORS_4 };
  }
};

/**
 * Validates if a move to a neighbor is permissible.
 * Checks for boundaries, walls, and previously visited states.
 *
 * @param current - Current node the robot is moving from
 * @param neighbor - Neighbor offset and heading info
 * @param neighborCellKey - Unique key for the neighbor cell ("row-col")
 * @param scenario - Current simulation scenario configuration
 * @param closedSet - Set of cell keys already fully evaluated
 * @returns True if the move is blocked or invalid
 */
const isInvalidMove = (
  current: EnergyNode,
  neighbor: { dr: number; dc: number; heading: Heading },
  neighborCellKey: string,
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
    closedSet.has(neighborCellKey)
  ) {
    return true;
  }

  // Corner-cutting prevention for diagonal moves
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
 * Calculates traversal costs, updates g-scores and f-scores, and manages the open set.
 *
 * @param current - Node currently being expanded
 * @param neighbors - List of valid directional offsets to check
 * @param scenario - Current simulation scenario configuration
 * @param destRow - Destination row
 * @param destCol - Destination column
 * @param openSet - The min-priority queue of nodes to explore
 * @param allNodes - Map of all discovered node states
 * @param closedSet - Set of cell keys already evaluated
 * @param visitedNodesInOrder - Sequence of visited nodes for animation
 * @param openedCells - Track cells that have been added to the open set
 */
const processNeighbors = (
  current: EnergyNode,
  neighbors: { dr: number; dc: number; heading: Heading }[],
  scenario: Scenario,
  destRow: number,
  destCol: number,
  openSet: EnergyNode[],
  allNodes: Map<string, EnergyNode>,
  closedSet: Set<string>,
  visitedNodesInOrder: { key: string; type: "open" | "closed" }[],
  openedCells: Set<string>,
  hFunc: (r1: number, c1: number, r2: number, c2: number) => number,
) => {
  for (const neighbor of neighbors) {
    const nr = current.row + neighbor.dr;
    const nc = current.col + neighbor.dc;
    const neighborCellKey = `${nr}-${nc}`;

    if (isInvalidMove(current, neighbor, neighborCellKey, scenario, closedSet)) continue;

    // Calculate traversal cost (g-score component)
    const stepCost = getSpatialCost({ heading: neighbor.heading });
    const tentativeG = current.g + stepCost;

    let neighborNode = allNodes.get(neighborCellKey);
    if (neighborNode && tentativeG >= neighborNode.g) continue;

    if (!neighborNode) {
      const h = hFunc(nr, nc, destRow, destCol);
      neighborNode = {
        key: neighborCellKey,
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

    allNodes.set(neighborCellKey, neighborNode);
    MinHeap.push(openSet, { ...neighborNode });

    markNodeVisited(neighborCellKey, "open", scenario, visitedNodesInOrder, openedCells);
  }
};

/**
 * Generic implementation of the standard A* pathfinding algorithm.
 * Can be configured with various distance heuristics (Manhattan, Euclidean, etc.).
 * Focuses on spatial distance rather than energy constraints.
 *
 * @param scenario - The complete environment and configuration for the search
 * @param heuristicType - The heuristic metric to use for h-score calculation
 * @returns Result object containing animation sequence, shortest path, and metrics
 */
const runAStarStandard = (scenario: Scenario, heuristicType: HeuristicType) => {
  const [startRow, startCol] = scenario.robotNode.split("-").map(Number);
  const [destRow, destCol] = scenario.destinationNode.split("-").map(Number);

  const { hFunc, neighbors } = getHeuristicData(heuristicType);

  const openSet: EnergyNode[] = [];
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

    if (current.row === destRow && current.col === destCol) {
      return {
        visitedNodesInOrder,
        ...getShortestPathData(current, scenario, nodesEvaluated),
      };
    }

    markNodeVisited(current.key, "closed", scenario, visitedNodesInOrder, closedCells);

    processNeighbors(
      current,
      neighbors,
      scenario,
      destRow,
      destCol,
      openSet,
      allNodes,
      closedSet,
      visitedNodesInOrder,
      openedCells,
      hFunc,
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

/**
 * Standard A* using Manhattan distance heuristic (best for 4-way movement).
 */
export const runAStarManhattan = (scenario: Scenario) => runAStarStandard(scenario, "manhattan");

/**
 * Standard A* using Euclidean distance heuristic.
 */
export const runAStarEuclidean = (scenario: Scenario) => runAStarStandard(scenario, "euclidean");

/**
 * Standard A* using Chebyshev distance heuristic (best for 8-way movement where diagonals cost 1).
 */
export const runAStarChebyshev = (scenario: Scenario) => runAStarStandard(scenario, "chebyshev");

/**
 * Standard A* using Octile distance heuristic (best for 8-way movement where diagonals cost SQRT(2)).
 */
export const runAStarOctile = (scenario: Scenario) => runAStarStandard(scenario, "octile");
