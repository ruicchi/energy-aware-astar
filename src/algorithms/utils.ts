import { type Heading, type EnergyNode, type Scenario } from '../types'

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
  const targetKey = `${target.row}-${target.col}`;
  const terrainFactor = scenario.terrainFactors.get(targetKey) || 0;
  const currentElevation = scenario.elevations.get(`${current.row}-${current.col}`) || 0;
  const targetElevation = scenario.elevations.get(targetKey) || 0;

  const elevationDelta = targetElevation - currentElevation;

  // Uphill costs more (climbingFactor), Downhill saves energy (0.5 recovery factor)
  const climbingCost =
    elevationDelta > 0 ? elevationDelta * scenario.climbingFactor : elevationDelta * 0.5;

  const turnCost = getTurnCost(current.heading, target.heading, scenario.turnPenalty);

  // Diagonal distance factor (1.0 cardinal, SQRT2 diagonal)
  const isDiagonal = target.heading.includes("_");
  const stepDistance = isDiagonal ? SQRT2 : 1.0;

  // Final cost: distance * terrain + climbing/recovery + turn
  return stepDistance * (1 + terrainFactor) + climbingCost + turnCost;
};
