import { type Heading, type EnergyNode, type Scenario, type EnergyBreakdown } from '../types'

export const SQRT2 = 1.414

export const getTurnCost = (current: Heading, target: Heading, penalty: number): number => {
  if (current === "NONE" || current === target) return 0;

  const headings: Heading[] = [
    "UP",
    "UP_RIGHT",
    "RIGHT",
    "DOWN_RIGHT",
    "DOWN",
    "DOWN_LEFT",
    "LEFT",
    "UP_LEFT",
  ];
  const currentIndex = headings.indexOf(current);
  const targetIndex = headings.indexOf(target);

  if (currentIndex === -1 || targetIndex === -1) return 0;

  let diff = Math.abs(currentIndex - targetIndex);
  if (diff > 4) diff = 8 - diff; // Shortest path around the 8-direction circle

  // diff 1 = 45°, diff 2 = 90°, diff 3 = 135°, diff 4 = 180°
  return diff * 0.5 * penalty;
};

export const getEnergyCost = (
  current: EnergyNode,
  target: { row: number; col: number; heading: Heading },
  scenario: Scenario,
): number => {
  return getEnergyCostBreakdown(current, target, scenario).total;
};

const getTerrainPenaltyBreakdown = (
  terrainFactor: number,
  distanceBasis: number,
): Pick<EnergyBreakdown, "dirtPenalty" | "waterPenalty" | "otherTerrainPenalty" | "total"> => {
  const terrainPenalty = distanceBasis * terrainFactor;
  const dirtPenalty = terrainFactor === 0.5 ? terrainPenalty : 0;
  const waterPenalty = terrainFactor === 2.0 ? terrainPenalty : 0;
  const otherTerrainPenalty =
    terrainFactor !== 0 && terrainFactor !== 0.5 && terrainFactor !== 2.0
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
  current: Pick<EnergyBreakdown, "dirtPenalty" | "waterPenalty" | "otherTerrainPenalty" | "total">,
  next: Pick<EnergyBreakdown, "dirtPenalty" | "waterPenalty" | "otherTerrainPenalty" | "total">,
): Pick<EnergyBreakdown, "dirtPenalty" | "waterPenalty" | "otherTerrainPenalty" | "total"> => ({
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
  const terrainFactor = scenario.terrainFactors.get(targetKey) || 0;
  const currentElevation = scenario.elevations.get(currentKey) || 0;
  const targetElevation = scenario.elevations.get(targetKey) || 0;

  const elevationDelta = targetElevation - currentElevation;

  // Uphill costs more (climbingFactor), Downhill saves energy (0.5 recovery factor)
  const climbingCost =
    elevationDelta > 0 ? elevationDelta * scenario.climbingFactor : elevationDelta * 0.5;

  const turnCost = getTurnCost(current.heading, target.heading, scenario.turnPenalty);

  // Diagonal distance factor (1.0 cardinal, SQRT2 diagonal)
  const isDiagonal = target.heading.includes("_");
  const stepDistance = isDiagonal ? SQRT2 : 1.0;
  const straightMovement = isDiagonal ? 0 : stepDistance;
  const diagonalMovement = isDiagonal ? stepDistance : 0;
  const targetTerrainBreakdown = getTerrainPenaltyBreakdown(terrainFactor, stepDistance);
  const isFirstMoveFromRobot = current.parent === null && currentKey === scenario.robotNode;
  const startingTerrainBreakdown = isFirstMoveFromRobot
    ? getTerrainPenaltyBreakdown(scenario.terrainFactors.get(scenario.robotNode) || 0, stepDistance)
    : getTerrainPenaltyBreakdown(0, 0);
  const terrainBreakdown = addTerrainPenaltyBreakdown(
    targetTerrainBreakdown,
    startingTerrainBreakdown,
  );
  const total =
    stepDistance +
    terrainBreakdown.total +
    climbingCost +
    turnCost;

  // Final cost: distance * terrain + climbing/recovery + turn
  return {
    baseMovement: stepDistance,
    straightMovement,
    diagonalMovement,
    dirtPenalty: terrainBreakdown.dirtPenalty,
    waterPenalty: terrainBreakdown.waterPenalty,
    otherTerrainPenalty: terrainBreakdown.otherTerrainPenalty,
    elevationCost: climbingCost,
    turnCost,
    total,
  };
};

export const createEmptyEnergyBreakdown = (): EnergyBreakdown => ({
  baseMovement: 0,
  straightMovement: 0,
  diagonalMovement: 0,
  dirtPenalty: 0,
  waterPenalty: 0,
  otherTerrainPenalty: 0,
  elevationCost: 0,
  turnCost: 0,
  total: 0,
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
  elevationCost: total.elevationCost + step.elevationCost,
  turnCost: total.turnCost + step.turnCost,
  total: total.total + step.total,
});

export const getHeadingBetweenNodes = (
  from: Pick<EnergyNode, "row" | "col">,
  to: Pick<EnergyNode, "row" | "col">,
): Heading => {
  const dr = to.row - from.row;
  const dc = to.col - from.col;

  if (dr === -1 && dc === 0) return "UP";
  if (dr === 1 && dc === 0) return "DOWN";
  if (dr === 0 && dc === -1) return "LEFT";
  if (dr === 0 && dc === 1) return "RIGHT";
  if (dr === -1 && dc === -1) return "UP_LEFT";
  if (dr === -1 && dc === 1) return "UP_RIGHT";
  if (dr === 1 && dc === -1) return "DOWN_LEFT";
  if (dr === 1 && dc === 1) return "DOWN_RIGHT";
  return "NONE";
};

export const getPathEnergyBreakdown = (
  endNode: EnergyNode,
  scenario: Scenario,
): EnergyBreakdown => {
  const steps: EnergyNode[] = [];
  let temp: EnergyNode | null = endNode;

  while (temp) {
    steps.unshift(temp);
    temp = temp.parent;
  }

  return steps.slice(1).reduce((total, node, index) => {
    const parent = steps[index];
    const stepHeading = getHeadingBetweenNodes(parent, node);
    const stepBreakdown = getEnergyCostBreakdown(
      parent,
      { row: node.row, col: node.col, heading: stepHeading },
      scenario,
    );

    return addEnergyBreakdown(total, stepBreakdown);
  }, createEmptyEnergyBreakdown());
};
