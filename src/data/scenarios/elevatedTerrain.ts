import type { Scenario } from "../../shared/types";
import { VEHICLE_CONFIG, ENERGY_CONFIG } from "../../config/simulationConfig";

/**
 * Generates a ridge/hill elevation map centered at the diagonal.
 */
function createElevatedMap(): Map<string, number> {
  const map = new Map<string, number>();
  // Mountain peak centered around (12, 12)
  for (let r = 7; r <= 17; r++) {
    for (let c = 7; c <= 17; c++) {
      const distFromCenter = Math.hypot(r - 12, c - 12);
      if (distFromCenter <= 5) {
        // High steep hill: peak is 8, sloping down to 2
        const height = Math.round(Math.max(1, 8 - distFromCenter * 1.5));
        map.set(`${r}-${c}`, height);
      }
    }
  }
  return map;
};

/**
 * Scenario 2: Steep Ridge / Elevation Hill
 * Contains a steep hill directly blocking the diagonal line of sight.
 * Standard algorithms attempt direct ascent, incurring extreme climbing energy
 * and rollover risk, while Energy-Aware A* contours around the base.
 */
export const elevatedTerrainScenario: Scenario = {
  rows: 25,
  cols: 25,
  robotNode: "2-2",
  destinationNode: "22-22",
  initialHeading: "DOWN_RIGHT",
  wallNodes: new Set(),
  terrainFactors: new Map(),
  elevations: createElevatedMap(),
  climbingFactor: ENERGY_CONFIG.climbingFactor,
  turnPenalty: ENERGY_CONFIG.turnPenalty,
  maxTraversableSlope: 30, // Slopes > 30 degrees are deemed untraversable
  robotPhysics: VEHICLE_CONFIG,
};

// Backward-compatibility export
export const elevatedTerrain = elevatedTerrainScenario;

