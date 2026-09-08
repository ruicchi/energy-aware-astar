import type { Heading, EnergyNode, Scenario, EnergyBreakdown, VisitedNode } from "../shared/types";
import { TERRAIN_CONFIG } from "../config/simulationConfig";
import {
  SQRT2,
  HEADING_ANGLES,
  getStepDistance,
  getSlopeDegrees,
  getPosture,
  getHeading as getHeadingBetweenNodes,
} from "../physics/terrainPhysics";

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

export const getTurnCost = (current: Heading, target: Heading, penalty: number): number => {
  if (current === "NONE" || target === "NONE" || current === target) return 0;

  const currentIndex = HEADING_ORDER[current];
  const targetIndex = HEADING_ORDER[target];
  if (currentIndex === undefined || targetIndex === undefined) return 0;

  let diff = Math.abs(currentIndex - targetIndex);
  if (diff > 4) diff = 8 - diff; // Shortest path around the 8-direction circle

  const radians = diff * (Math.PI / 4);
  return radians * penalty;
};

export const getMinAngleToDestination = (
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

export const getSpatialCost = (target: { heading: Heading }): number => {
  return getStepDistance(target.heading);
};

export const getEnergyCost = (
  current: EnergyNode,
  target: { row: number; col: number; heading: Heading },
  scenario: Scenario,
): number => {
  return getEnergyCostBreakdown(current, target, scenario).total;
};

type TerrainPenaltyBreakdown = Pick<
  EnergyBreakdown,
  "dirtPenalty" | "waterPenalty" | "otherTerrainPenalty" | "total"
>;

const getTerrainPenaltyBreakdown = (
  terrainFactor: number,
  distanceBasis: number,
): TerrainPenaltyBreakdown => {
  const terrainPenalty = distanceBasis * terrainFactor;
  const dirtPenalty = terrainFactor === TERRAIN_CONFIG.types.dirt.cost ? terrainPenalty : 0;
  const waterPenalty = terrainFactor === TERRAIN_CONFIG.types.water.cost ? terrainPenalty : 0;
  const otherTerrainPenalty =
    terrainFactor !== 0 &&
    terrainFactor !== TERRAIN_CONFIG.types.dirt.cost &&
    terrainFactor !== TERRAIN_CONFIG.types.water.cost
      ? terrainPenalty
      : 0;

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

export const getEnergyCostBreakdown = (
  current: EnergyNode,
  target: { row: number; col: number; heading: Heading },
  scenario: Scenario,
): EnergyBreakdown => {
  const targetKey = `${target.row}-${target.col}`;
  const currentKey = `${current.row}-${current.col}`;

  const startTerrainFactor = scenario.terrainFactors.get(currentKey) || 0;
  const targetTerrainFactor = scenario.terrainFactors.get(targetKey) || 0;

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
  // Use scenario.climbingFactor as the base multiplier for normal uphill movement
  if (elevationDelta > 0) {
    gradientPenaltyMultiplier = slopeDegrees <= 30 ? scenario.climbingFactor : 20.0;
  }

  const rawTurnCost = getTurnCost(current.heading, target.heading, scenario.turnPenalty);

  // Use average terrain factor for the move (0.5 distance in start cell, 0.5 in target cell)
  const startTerrainBreakdown = getTerrainPenaltyBreakdown(startTerrainFactor, stepDistance / 2);
  const targetTerrainBreakdown = getTerrainPenaltyBreakdown(targetTerrainFactor, stepDistance / 2);

  const terrainBreakdown = addTerrainPenaltyBreakdown(
    startTerrainBreakdown,
    targetTerrainBreakdown,
  );

  const climbingCost = stepDistance * (gradientPenaltyMultiplier - 1.0);
  const turnCost = rawTurnCost;
  const movementCost = stepDistance + climbingCost + turnCost;
  const subtotal = movementCost + terrainBreakdown.total;

  const { roll, pitch } = getPosture(target.row, target.col, target.heading, scenario);

  // NOTE: Asymmetric Risk: Roll (lateral) more dangerous than Pitch (longitudinal)
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

export const createEmptyEnergyBreakdown = (): EnergyBreakdown => ({
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

export const addEnergyBreakdown = (
  total: EnergyBreakdown,
  step: EnergyBreakdown,
): EnergyBreakdown => ({
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

export const getPathEnergyBreakdown = (
  endNode: EnergyNode,
  scenario: Scenario,
): EnergyBreakdown => {
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
    const stepHeading = getHeadingBetweenNodes(parent, node);

    // Create a virtual parent node that has the simulated heading
    // This ensures getEnergyCostBreakdown calculates turn costs correctly
    // by comparing currentSimulatedHeading with stepHeading
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

/**
 * Traces back from the destination node to the start node to construct the final path.
 * Also calculates total distance and compiles the energy consumption breakdown.
 *
 * @param current - The final (destination) node reached
 * @param scenario - Current simulation scenario configuration
 * @param nodesEvaluated - Total number of nodes popped from the open set
 * @returns Object containing path keys, total energy, total distance, and detailed breakdown
 */
export const getShortestPathData = (
  current: EnergyNode,
  scenario: Scenario,
  nodesEvaluated: number,
) => {
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
    shortestPath: Array.from(new Set(shortestPath)),
    totalEnergy: energyBreakdown.total,
    totalDistance,
    energyBreakdown,
  };
};

/**
 * Records a node as visited for visualization/animation purposes.
 * Ensures start and destination nodes are not double-counted and prevents duplicate entries.
 *
 * @param key - Cell key to mark
 * @param type - Whether the node was added to the open set or moved to the closed set
 * @param scenario - Current simulation scenario configuration
 * @param visitedNodesInOrder - Array tracking the sequence of visits for animation
 * @param trackedCells - Set used to ensure each cell is only recorded once for a specific type
 */
export const markNodeVisited = (
  key: string,
  type: "open" | "closed",
  scenario: Scenario,
  visitedNodesInOrder: VisitedNode[],
  trackedCells: Set<string>,
) => {
  const isSpecial = key === scenario.robotNode || key === scenario.destinationNode;
  if (!isSpecial && !trackedCells.has(key)) {
    visitedNodesInOrder.push({ key, type });
    trackedCells.add(key);
  }
};
