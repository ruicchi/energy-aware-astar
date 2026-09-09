import type { Scenario } from "../../shared/types";
import { VEHICLE_CONFIG, ENERGY_CONFIG, TERRAIN_CONFIG } from "../../config/simulationConfig";

/**
 * Scenario 1: Flat Obstacle Course
 * Uniform zero elevation and uniform flat terrain friction.
 * Evaluates geometric path length vs. turning penalties across algorithms.
 */
export const flatTerrainScenario: Scenario = {
  rows: 25,
  cols: 25,
  robotNode: "2-2",
  destinationNode: "22-22",
  initialHeading: "DOWN_RIGHT",
  wallNodes: new Set([
    // Vertical barrier 1 with opening
    "5-8", "6-8", "7-8", "8-8", "9-8", "10-8", "11-8", "12-8", "13-8",
    // Horizontal barrier 2 with opening
    "14-10", "14-11", "14-12", "14-13", "14-14", "14-15", "14-16", "14-17",
    // Vertical barrier 3
    "10-18", "11-18", "12-18", "13-18", "14-18", "15-18", "16-18", "17-18", "18-18",
  ]),
  terrainFactors: new Map(),
  elevations: new Map(),
  climbingFactor: ENERGY_CONFIG.climbingFactor,
  turnPenalty: ENERGY_CONFIG.turnPenalty,
  maxTraversableSlope: TERRAIN_CONFIG.defaultMaxTraversableSlope,
  robotPhysics: VEHICLE_CONFIG,
};
