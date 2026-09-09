import type { Scenario } from "../../shared/types";
import { VEHICLE_CONFIG, ENERGY_CONFIG, TERRAIN_CONFIG } from "../../config/simulationConfig";

/**
 * Creates a high-friction mud and water zone across the center diagonal.
 */
const createFrictionMap = (): {
  terrainFactors: Map<string, number>;
  terrainTypes: Map<string, "dirt" | "water">;
} => {
  const terrainFactors = new Map<string, number>();
  const terrainTypes = new Map<string, "dirt" | "water">();

  // Dense mud swamp between rows 8-16 and cols 8-16
  for (let r = 8; r <= 16; r++) {
    for (let c = 8; c <= 16; c++) {
      const isInnerWater = r >= 10 && r <= 14 && c >= 10 && c <= 14;
      if (isInnerWater) {
        terrainFactors.set(`${r}-${c}`, 8.0); // Severe water drag
        terrainTypes.set(`${r}-${c}`, "water");
      } else {
        terrainFactors.set(`${r}-${c}`, 3.5); // Sticky mud drag
        terrainTypes.set(`${r}-${c}`, "dirt");
      }
    }
  }

  return { terrainFactors, terrainTypes };
};

const frictionData = createFrictionMap();

/**
 * Scenario 3: High-Friction Mud & Water Field
 * Tests friction avoidance vs detour distance trade-off on flat ground.
 */
export const frictionTerrainScenario: Scenario = {
  rows: 25,
  cols: 25,
  robotNode: "2-2",
  destinationNode: "22-22",
  initialHeading: "DOWN_RIGHT",
  wallNodes: new Set(),
  terrainFactors: frictionData.terrainFactors,
  terrainTypes: frictionData.terrainTypes,
  elevations: new Map(),
  climbingFactor: ENERGY_CONFIG.climbingFactor,
  turnPenalty: ENERGY_CONFIG.turnPenalty,
  maxTraversableSlope: TERRAIN_CONFIG.defaultMaxTraversableSlope,
  robotPhysics: VEHICLE_CONFIG,
};

/**
 * Scenario 4: Complex Multi-Hazard Environment
 * Combines elevation hills, mud patches, and wall barriers in a realistic map.
 */
const createComplexMap = () => {
  const elevations = new Map<string, number>();
  const terrainFactors = new Map<string, number>();
  const terrainTypes = new Map<string, "dirt" | "water">();
  const wallNodes = new Set<string>();

  // Hill 1: Upper-right sector
  for (let r = 4; r <= 10; r++) {
    for (let c = 12; c <= 18; c++) {
      const d = Math.hypot(r - 7, c - 15);
      if (d <= 3) elevations.set(`${r}-${c}`, Math.round(5 - d));
    }
  }

  // Hill 2: Lower-left sector
  for (let r = 14; r <= 20; r++) {
    for (let c = 6; c <= 12; c++) {
      const d = Math.hypot(r - 17, c - 9);
      if (d <= 3) elevations.set(`${r}-${c}`, Math.round(6 - d));
    }
  }

  // Muddy valley in center
  for (let r = 10; r <= 14; r++) {
    for (let c = 10; c <= 14; c++) {
      terrainFactors.set(`${r}-${c}`, 4.0);
      terrainTypes.set(`${r}-${c}`, "dirt");
    }
  }

  // Strategic obstacles forcing routing choices
  const walls = [
    "7-7", "8-7", "9-7",
    "15-17", "16-17", "17-17",
    "12-6", "12-7", "12-8",
  ];
  walls.forEach((w) => wallNodes.add(w));

  return { elevations, terrainFactors, terrainTypes, wallNodes };
};

const complexData = createComplexMap();

export const mixedTerrainScenario: Scenario = {
  rows: 25,
  cols: 25,
  robotNode: "2-2",
  destinationNode: "22-22",
  initialHeading: "DOWN_RIGHT",
  wallNodes: complexData.wallNodes,
  terrainFactors: complexData.terrainFactors,
  terrainTypes: complexData.terrainTypes,
  elevations: complexData.elevations,
  climbingFactor: ENERGY_CONFIG.climbingFactor,
  turnPenalty: ENERGY_CONFIG.turnPenalty,
  maxTraversableSlope: 30,
  robotPhysics: VEHICLE_CONFIG,
};

// Backward compatibility export
export const mixedTerrain = mixedTerrainScenario;
