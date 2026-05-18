import { type Scenario } from "../../types";

export const elevatedTerrain: Scenario = {
  rows: 20,
  cols: 20,
  robotNode: "2-2",
  destinationNode: "18-18",
  initialHeading: "DOWN_RIGHT",
  wallNodes: new Set(),
  terrainFactors: new Map(),
  elevations: new Map([
    ["5-5", 1],
    ["5-6", 1],
    ["5-7", 1],
    ["6-5", 2],
    ["6-6", 2],
    ["6-7", 2],
    ["7-5", 3],
    ["7-6", 3],
    ["7-7", 3],
  ]),
  climbingFactor: 10,
  turnPenalty: 1,
  maxTraversableSlope: 15,
  robotPhysics: {
    trackWidth: 0.8,
    wheelBase: 1.2,
    comHeight: 0.6,
    stabilityMargin: 0.05,
  },
};
