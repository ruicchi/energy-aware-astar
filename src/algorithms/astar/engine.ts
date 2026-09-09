import type {
  Scenario,
  Heading,
  EnergyNode,
  PathfindingResult,
  AlgorithmType,
  VisitedNode,
  EnergyBreakdown,
} from "../../shared/types";
import {
  SQRT2,
  HEADING_ANGLES,
  getStepDistance,
  getSlopeDegrees,
  getPosture,
  getHeading,
  isTraversableSlope,
} from "../../physics/terrainPhysics";
import { TERRAIN_CONFIG } from "../../config/simulationConfig";
import * as MinHeap from "./MinHeap";

export interface PathfindingOptions {
  algorithm?: AlgorithmType;
}

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

const HEADING_ORDER: Record<Exclude<Heading, "NONE">, number> = {
  UP: 0,
  UP_RIGHT: 1,
  RIGHT: 2,
  DOWN_RIGHT: 3,
  DOWN: 4,
  DOWN_LEFT: 5,
  LEFT: 6,
  UP_LEFT: 7,
};

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

const S_MAX = 2;

const getTurnCost = (current: Heading, target: Heading, penalty: number): number => {
  if (current === "NONE" || target === "NONE" || current === target) return 0;

  const currentIndex = HEADING_ORDER[current];
  const targetIndex = HEADING_ORDER[target];
  if (currentIndex === undefined || targetIndex === undefined) return 0;

  let diff = Math.abs(currentIndex - targetIndex);
  if (diff > 4) diff = 8 - diff; // Shortest path around the 8-direction circle

  const radians = diff * (Math.PI / 4);
  return radians * penalty;
};

const getMinAngleToDestination = (
  currentHeading: Heading,
  currentRow: number,
  currentCol: number,
  destRow: number,
  destCol: number,
): number => {
  if (currentHeading === "NONE") return 0;

  const currentAngle = HEADING_ANGLES[currentHeading as Exclude<Heading, "NONE">];
  const dy = destRow - currentRow;
  const dx = destCol - currentCol;
  if (dx === 0 && dy === 0) return 0;

  const destAngle = Math.atan2(dy, dx);
  let diff = Math.abs(currentAngle - destAngle);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return diff;
};

const calculateEnergyHeuristic = (
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

  const currentElevation = scenario.elevations.get(`${row}-${col}`) || 0;
  const destElevation = scenario.elevations.get(scenario.destinationNode) || 0;
  const elevationDelta = destElevation - currentElevation;
  const hElev = elevationDelta > 0 ? elevationDelta * scenario.climbingFactor : 0;

  return hTrans + hRot + hElev;
};

type TerrainPenaltyBreakdown = Pick<
  EnergyBreakdown,
  "dirtPenalty" | "waterPenalty" | "otherTerrainPenalty" | "total"
>;

const getTerrainPenaltyBreakdown = (
  terrainFactor: number,
  distanceBasis: number,
  terrainType?: "dirt" | "water",
): TerrainPenaltyBreakdown => {
  const terrainPenalty = distanceBasis * terrainFactor;
  let dirtPenalty = 0;
  let waterPenalty = 0;
  let otherTerrainPenalty = 0;

  if (terrainType === "dirt") {
    dirtPenalty = terrainPenalty;
  } else if (terrainType === "water") {
    waterPenalty = terrainPenalty;
  } else if (terrainFactor === TERRAIN_CONFIG.types.dirt.cost) {
    dirtPenalty = terrainPenalty;
  } else if (terrainFactor === TERRAIN_CONFIG.types.water.cost) {
    waterPenalty = terrainPenalty;
  } else if (terrainFactor !== 0) {
    otherTerrainPenalty = terrainPenalty;
  }

  return {
    dirtPenalty,
    waterPenalty,
    otherTerrainPenalty,
    total: dirtPenalty + waterPenalty + otherTerrainPenalty,
  };
};

const addTerrainPenaltyBreakdown = (
  current: TerrainPenaltyBreakdown,
  next: TerrainPenaltyBreakdown,
): TerrainPenaltyBreakdown => ({
  dirtPenalty: current.dirtPenalty + next.dirtPenalty,
  waterPenalty: current.waterPenalty + next.waterPenalty,
  otherTerrainPenalty: current.otherTerrainPenalty + next.otherTerrainPenalty,
  total: current.total + next.total,
});

const getEnergyCostBreakdown = (
  current: EnergyNode,
  target: { row: number; col: number; heading: Heading },
  scenario: Scenario,
): EnergyBreakdown => {
  const targetKey = `${target.row}-${target.col}`;
  const currentKey = `${current.row}-${current.col}`;

  const startTerrainFactor = scenario.terrainFactors.get(currentKey) || 0;
  const targetTerrainFactor = scenario.terrainFactors.get(targetKey) || 0;
  const startTerrainType = scenario.terrainTypes?.get(currentKey);
  const targetTerrainType = scenario.terrainTypes?.get(targetKey);

  const currentElevation = scenario.elevations.get(currentKey) || 0;
  const targetElevation = scenario.elevations.get(targetKey) || 0;

  const elevationDelta = targetElevation - currentElevation;
  const stepDistance = getStepDistance(target.heading);
  const isDiagonal = stepDistance === SQRT2;
  const straightMovement = isDiagonal ? 0 : stepDistance;
  const diagonalMovement = isDiagonal ? stepDistance : 0;

  const slopeDegrees = getSlopeDegrees(current, target, scenario);
  let gradientPenaltyMultiplier = 1.0;

  // Apply a massive penalty for slopes over 30 degrees to simulate real-world vehicle limits
  if (elevationDelta > 0) {
    gradientPenaltyMultiplier = slopeDegrees <= 30 ? scenario.climbingFactor : 20.0;
  }

  const rawTurnCost = getTurnCost(current.heading, target.heading, scenario.turnPenalty);

  // Use average terrain factor for the move (0.5 distance in start cell, 0.5 in target cell)
  const startTerrainBreakdown = getTerrainPenaltyBreakdown(
    startTerrainFactor,
    stepDistance / 2,
    startTerrainType,
  );
  const targetTerrainBreakdown = getTerrainPenaltyBreakdown(
    targetTerrainFactor,
    stepDistance / 2,
    targetTerrainType,
  );

  const terrainBreakdown = addTerrainPenaltyBreakdown(
    startTerrainBreakdown,
    targetTerrainBreakdown,
  );

  const climbingCost = stepDistance * (gradientPenaltyMultiplier - 1.0);
  const turnCost = rawTurnCost;
  const movementCost = stepDistance + climbingCost + turnCost;
  const subtotal = movementCost + terrainBreakdown.total;

  const { roll, pitch } = getPosture(target.row, target.col, target.heading, scenario);

  // Asymmetric Risk: Roll (lateral) is more dangerous than Pitch (longitudinal)
  const kRoll = 3.0;
  const kPitch = 1.0;
  const riskFactor = Math.hypot(roll * kRoll, pitch * kPitch);

  const riskWeight = 2.0;
  const stabilityPenalty = subtotal * riskWeight * riskFactor;

  const total = subtotal + stabilityPenalty;

  return {
    baseMovement: stepDistance,
    straightMovement,
    diagonalMovement,
    dirtPenalty: terrainBreakdown.dirtPenalty,
    waterPenalty: terrainBreakdown.waterPenalty,
    otherTerrainPenalty: terrainBreakdown.otherTerrainPenalty,
    climbingCost,
    turnCost,
    stabilityPenalty,
    total,
    nodesEvaluated: 0,
  };
};

const getEnergyCost = (
  current: EnergyNode,
  target: { row: number; col: number; heading: Heading },
  scenario: Scenario,
): number => {
  return getEnergyCostBreakdown(current, target, scenario).total;
};

const createEmptyEnergyBreakdown = (): EnergyBreakdown => ({
  baseMovement: 0,
  straightMovement: 0,
  diagonalMovement: 0,
  dirtPenalty: 0,
  waterPenalty: 0,
  otherTerrainPenalty: 0,
  climbingCost: 0,
  turnCost: 0,
  stabilityPenalty: 0,
  total: 0,
  nodesEvaluated: 0,
});

const addEnergyBreakdown = (total: EnergyBreakdown, step: EnergyBreakdown): EnergyBreakdown => ({
  baseMovement: total.baseMovement + step.baseMovement,
  straightMovement: total.straightMovement + step.straightMovement,
  diagonalMovement: total.diagonalMovement + step.diagonalMovement,
  dirtPenalty: total.dirtPenalty + step.dirtPenalty,
  waterPenalty: total.waterPenalty + step.waterPenalty,
  otherTerrainPenalty: total.otherTerrainPenalty + step.otherTerrainPenalty,
  climbingCost: total.climbingCost + step.climbingCost,
  turnCost: total.turnCost + step.turnCost,
  stabilityPenalty: total.stabilityPenalty + step.stabilityPenalty,
  total: total.total + step.total,
  nodesEvaluated: total.nodesEvaluated + step.nodesEvaluated,
});

const getPathEnergyBreakdown = (endNode: EnergyNode, scenario: Scenario): EnergyBreakdown => {
  const steps: EnergyNode[] = [];
  let temp: EnergyNode | null = endNode;

  while (temp) {
    steps.push(temp);
    temp = temp.parent;
  }
  steps.reverse();

  let total = createEmptyEnergyBreakdown();
  let currentSimulatedHeading = scenario.initialHeading;

  for (let i = 1; i < steps.length; i++) {
    const parent = steps[i - 1];
    const node = steps[i];
    const stepHeading = getHeading(parent, node);

    const virtualParent: EnergyNode = {
      ...parent,
      heading: currentSimulatedHeading,
    };

    const stepBreakdown = getEnergyCostBreakdown(
      virtualParent,
      { row: node.row, col: node.col, heading: stepHeading },
      scenario,
    );

    currentSimulatedHeading = stepHeading;
    total = addEnergyBreakdown(total, stepBreakdown);
  }

  return total;
};

const compilePathfindingResult = (
  current: EnergyNode,
  scenario: Scenario,
  nodesEvaluated: number,
  visitedNodesInOrder: VisitedNode[],
): PathfindingResult => {
  const shortestPath: string[] = [];
  let totalDistance = 0;
  let temp: EnergyNode | null = current;

  while (temp) {
    shortestPath.push(`${temp.row}-${temp.col}`);
    if (temp.parent) {
      const isDiagonal = temp.row !== temp.parent.row && temp.col !== temp.parent.col;
      totalDistance += isDiagonal ? SQRT2 : 1.0;
    }
    temp = temp.parent;
  }
  shortestPath.reverse();

  const energyBreakdown = getPathEnergyBreakdown(current, scenario);
  energyBreakdown.nodesEvaluated = nodesEvaluated;

  return {
    visitedNodesInOrder,
    shortestPath: Array.from(new Set(shortestPath)),
    totalEnergy: energyBreakdown.total,
    totalDistance,
    energyBreakdown,
  };
};

interface SearchPolicy {
  neighbors: { dr: number; dc: number; heading: Heading }[];
  getStateKey: (row: number, col: number, heading: Heading) => string;
  resolveHeading: (neighborHeading: Heading) => Heading;
  isMoveBlocked: (
    current: EnergyNode,
    nr: number,
    nc: number,
    neighborHeading: Heading,
    cellKey: string,
    stateKey: string,
    closedSet: Set<string>,
  ) => boolean;
  computeStepCost: (
    current: EnergyNode,
    target: { row: number; col: number; heading: Heading },
  ) => number;
  computeHeuristic: (
    row: number,
    col: number,
    heading: Heading,
    destRow: number,
    destCol: number,
  ) => number;
}

const createEnergyAwarePolicy = (scenario: Scenario): SearchPolicy => ({
  neighbors: NEIGHBORS_8,
  getStateKey: (row, col, heading) => `${row}-${col}-${heading}`,
  resolveHeading: (neighborHeading) => neighborHeading,
  isMoveBlocked: (current, nr, nc, neighborHeading, cellKey, stateKey, closedSet) => {
    if (nr < 0 || nr >= scenario.rows || nc < 0 || nc >= scenario.cols) return true;
    if (scenario.wallNodes.has(cellKey)) return true;
    if (closedSet.has(stateKey)) return true;
    if (neighborHeading.includes("_")) {
      const cardinal1 = `${current.row + (nr - current.row)}-${current.col}`;
      const cardinal2 = `${current.row}-${current.col + (nc - current.col)}`;
      if (scenario.wallNodes.has(cardinal1) || scenario.wallNodes.has(cardinal2)) return true;
    }
    if (!isTraversableSlope(current, { row: nr, col: nc, heading: neighborHeading }, scenario)) {
      return true;
    }
    return false;
  },
  computeStepCost: (current, target) => getEnergyCost(current, target, scenario),
  computeHeuristic: (row, col, heading, destRow, destCol) =>
    calculateEnergyHeuristic(row, col, heading, destRow, destCol, scenario),
});

const createStandardPolicy = (
  scenario: Scenario,
  algorithm: "manhattan" | "euclidean" | "octile" | "chebyshev",
): SearchPolicy => {
  let hFunc = manhattanDistance;
  let neighbors = NEIGHBORS_4;

  switch (algorithm) {
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
    case "manhattan":
    default:
      hFunc = manhattanDistance;
      neighbors = NEIGHBORS_4;
      break;
  }

  return {
    neighbors,
    getStateKey: (row, col) => `${row}-${col}`,
    resolveHeading: (neighborHeading) => neighborHeading,
    isMoveBlocked: (current, nr, nc, neighborHeading, cellKey, stateKey, closedSet) => {
      if (nr < 0 || nr >= scenario.rows || nc < 0 || nc >= scenario.cols) return true;
      if (scenario.wallNodes.has(cellKey)) return true;
      if (closedSet.has(stateKey)) return true;
      if (neighborHeading.includes("_")) {
        const cardinal1 = `${current.row + (nr - current.row)}-${current.col}`;
        const cardinal2 = `${current.row}-${current.col + (nc - current.col)}`;
        if (scenario.wallNodes.has(cardinal1) || scenario.wallNodes.has(cardinal2)) return true;
      }
      return false;
    },
    computeStepCost: (_current, target) => getStepDistance(target.heading),
    computeHeuristic: (row, col, _heading, destRow, destCol) => hFunc(row, col, destRow, destCol),
  };
};

/**
 * Executes pathfinding on the provided scenario according to the selected search policy.
 * Consolidates open/closed set tracking, priority queue management, step costing arithmetic,
 * kinematic traversability validation, and telemetry reconstruction into a single deep module.
 *
 * @param scenario - The complete environment and configuration for the search
 * @param options - Configurable search options, including algorithm type
 * @returns Complete pathfinding result with animation visits and energy breakdown
 */
export const findPath = (scenario: Scenario, options?: PathfindingOptions): PathfindingResult => {
  const algorithm = options?.algorithm ?? "energyAware";
  const policy =
    algorithm === "energyAware"
      ? createEnergyAwarePolicy(scenario)
      : createStandardPolicy(scenario, algorithm);

  const [startRow, startCol] = scenario.robotNode.split("-").map(Number);
  const [destRow, destCol] = scenario.destinationNode.split("-").map(Number);

  const openSet: EnergyNode[] = [];
  const allNodes = new Map<string, EnergyNode>();
  const closedSet = new Set<string>();

  const visitedNodesInOrder: VisitedNode[] = [];
  const openedCells = new Set<string>();
  const closedCells = new Set<string>();

  const recordVisit = (key: string, type: "open" | "closed") => {
    const isSpecial = key === scenario.robotNode || key === scenario.destinationNode;
    const targetSet = type === "open" ? openedCells : closedCells;
    if (!isSpecial && !targetSet.has(key)) {
      visitedNodesInOrder.push({ key, type });
      targetSet.add(key);
    }
  };

  const startKey = policy.getStateKey(startRow, startCol, scenario.initialHeading);
  const startNode: EnergyNode = {
    key: startKey,
    row: startRow,
    col: startCol,
    heading: scenario.initialHeading,
    g: 0,
    h: policy.computeHeuristic(startRow, startCol, scenario.initialHeading, destRow, destCol),
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
      return compilePathfindingResult(current, scenario, nodesEvaluated, visitedNodesInOrder);
    }

    recordVisit(cellKey, "closed");

    for (const neighbor of policy.neighbors) {
      const nr = current.row + neighbor.dr;
      const nc = current.col + neighbor.dc;
      const neighborCellKey = `${nr}-${nc}`;
      const resolvedHeading = policy.resolveHeading(neighbor.heading);
      const neighborStateKey = policy.getStateKey(nr, nc, neighbor.heading);

      if (
        policy.isMoveBlocked(
          current,
          nr,
          nc,
          neighbor.heading,
          neighborCellKey,
          neighborStateKey,
          closedSet,
        )
      ) {
        continue;
      }

      const stepCost = policy.computeStepCost(current, {
        row: nr,
        col: nc,
        heading: neighbor.heading,
      });
      const tentativeG = current.g + stepCost;

      let neighborNode = allNodes.get(neighborStateKey);
      if (neighborNode && tentativeG >= neighborNode.g) continue;

      if (!neighborNode) {
        const h = policy.computeHeuristic(nr, nc, neighbor.heading, destRow, destCol);
        neighborNode = {
          key: neighborStateKey,
          row: nr,
          col: nc,
          heading: resolvedHeading,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        };
      } else {
        neighborNode.g = tentativeG;
        neighborNode.f = tentativeG + neighborNode.h;
        neighborNode.parent = current;
        neighborNode.heading = resolvedHeading;
      }

      allNodes.set(neighborStateKey, neighborNode);
      MinHeap.push(openSet, { ...neighborNode });

      recordVisit(neighborCellKey, "open");
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
