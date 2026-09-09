import type { Scenario, Heading } from "../../shared/types";
import { VEHICLE_CONFIG, ENERGY_CONFIG } from "../../config/simulationConfig";

/**
 * Fast, deterministic 32-bit pseudo-random number generator (Mulberry32).
 */
export const createRng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export interface ProceduralScenarioOptions {
  seed: number;
  rows?: number;
  cols?: number;
  startNode?: string;
  destinationNode?: string;
  initialHeading?: Heading;
  numHills?: number;
  numMudPatches?: number;
  obstacleDensity?: number;
}

/**
 * Procedurally generates a reproducible test scenario from an integer seed.
 */
export const generateProceduralScenario = (options: ProceduralScenarioOptions): Scenario => {
  const {
    seed,
    rows = 25,
    cols = 25,
    startNode = "2-2",
    destinationNode = `${rows - 3}-${cols - 3}`,
    initialHeading = "DOWN_RIGHT",
    numHills = 3,
    numMudPatches = 3,
    obstacleDensity = 0.05,
  } = options;

  const rng = createRng(seed);

  const [startR, startC] = startNode.split("-").map(Number);
  const [destR, destC] = destinationNode.split("-").map(Number);

  const isProtected = (r: number, c: number) => {
    const dStart = Math.hypot(r - startR, c - startC);
    const dDest = Math.hypot(r - destR, c - destC);
    // Keep start/goal areas and outer perimeter clear for a guaranteed lowland bypass route
    const isPerimeter = r <= 1 || r >= rows - 2 || c <= 1 || c >= cols - 2;
    return dStart <= 2.5 || dDest <= 2.5 || isPerimeter;
  };

  // 1. Generate Hills (Gaussian drop-off)
  const elevations = new Map<string, number>();
  for (let i = 0; i < numHills; i++) {
    const centerR = Math.floor(5 + rng() * (rows - 10));
    const centerC = Math.floor(5 + rng() * (cols - 10));

    const peakHeight = Math.floor(3 + rng() * 5); // 3 to 7
    const radius = 2 + rng() * 3; // 2 to 5

    const minR = Math.max(0, Math.floor(centerR - radius * 1.5));
    const maxR = Math.min(rows - 1, Math.ceil(centerR + radius * 1.5));
    const minC = Math.max(0, Math.floor(centerC - radius * 1.5));
    const maxC = Math.min(cols - 1, Math.ceil(centerC + radius * 1.5));

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (isProtected(r, c)) continue;
        const d = Math.hypot(r - centerR, c - centerC);
        if (d <= radius * 1.5) {
          const elev = Math.round(peakHeight * Math.exp(-(d * d) / (2 * radius * radius)));
          if (elev > 0) {
            const current = elevations.get(`${r}-${c}`) || 0;
            elevations.set(`${r}-${c}`, Math.max(current, elev));
          }
        }
      }
    }
  }

  // 2. Generate Friction Patches (Dirt & Water)
  const terrainFactors = new Map<string, number>();
  const terrainTypes = new Map<string, "dirt" | "water">();

  for (let i = 0; i < numMudPatches; i++) {
    const centerR = Math.floor(3 + rng() * (rows - 6));
    const centerC = Math.floor(3 + rng() * (cols - 6));
    const radius = 1.5 + rng() * 2.5;
    const isWater = rng() > 0.6;
    const factor = isWater ? 6.0 + rng() * 3.0 : 2.5 + rng() * 2.5;
    const type = isWater ? "water" : "dirt";

    for (let r = Math.max(0, Math.floor(centerR - radius)); r <= Math.min(rows - 1, Math.ceil(centerR + radius)); r++) {
      for (let c = Math.max(0, Math.floor(centerC - radius)); c <= Math.min(cols - 1, Math.ceil(centerC + radius)); c++) {
        if (isProtected(r, c)) continue;
        const d = Math.hypot(r - centerR, c - centerC);
        if (d <= radius) {
          terrainFactors.set(`${r}-${c}`, factor);
          terrainTypes.set(`${r}-${c}`, type);
        }
      }
    }
  }

  // 3. Generate Wall Obstacles
  const wallNodes = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isProtected(r, c)) continue;
      if (rng() < obstacleDensity) {
        wallNodes.add(`${r}-${c}`);
      }
    }
  }

  return {
    rows,
    cols,
    robotNode: startNode,
    destinationNode,
    initialHeading,
    wallNodes,
    terrainFactors,
    terrainTypes,
    elevations,
    climbingFactor: ENERGY_CONFIG.climbingFactor,
    turnPenalty: ENERGY_CONFIG.turnPenalty,
    maxTraversableSlope: 30,
    robotPhysics: VEHICLE_CONFIG,
  };
};
