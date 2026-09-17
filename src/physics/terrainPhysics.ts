import type { Heading, Scenario } from "../shared/types";
import { TERRAIN_CONFIG, ENERGY_CONFIG } from "../config/simulationConfig";

export const SQRT2 = 1.414;
export const INV_SQRT2 = 1 / Math.sqrt(2);
export const ELEVATION_SCALE = TERRAIN_CONFIG.elevationScale;
export const DEFAULT_MAX_TRAVERSABLE_SLOPE = TERRAIN_CONFIG.defaultMaxTraversableSlope;
export const MAX_STABLE_GRADIENT = TERRAIN_CONFIG.maxStableGradient;

export const HEADING_ANGLES: Record<Exclude<Heading, "NONE">, number> = {
  UP: -Math.PI / 2,
  DOWN: Math.PI / 2,
  LEFT: Math.PI,
  RIGHT: 0,
  UP_RIGHT: -Math.PI / 4,
  UP_LEFT: (-3 * Math.PI) / 4,
  DOWN_RIGHT: Math.PI / 4,
  DOWN_LEFT: (3 * Math.PI) / 4,
};

export function getStepDistance(heading: Heading): number {
  return heading.includes("_") ? SQRT2 : 1.0;
}

function parseCoord(coordStr: string): { row: number; col: number } {
  const [row, col] = coordStr.split("-").map(Number);
  return { row, col };
}

export function getHeading(
  from: { row: number; col: number } | string,
  to: { row: number; col: number } | string,
): Heading {
  const fromCoord = typeof from === "string" ? parseCoord(from) : from;
  const toCoord = typeof to === "string" ? parseCoord(to) : to;
  const dr = toCoord.row - fromCoord.row;
  const dc = toCoord.col - fromCoord.col;

  if (dr === -1 && dc === 0) return "UP";
  if (dr === 1 && dc === 0) return "DOWN";
  if (dr === 0 && dc === -1) return "LEFT";
  if (dr === 0 && dc === 1) return "RIGHT";
  if (dr === -1 && dc === -1) return "UP_LEFT";
  if (dr === -1 && dc === 1) return "UP_RIGHT";
  if (dr === 1 && dc === -1) return "DOWN_LEFT";
  if (dr === 1 && dc === 1) return "DOWN_RIGHT";
  return "NONE";
}

export interface ElevationGradient {
  zx: number;
  zy: number;
  magnitude: number;
  angle: number;
  isUnstable: boolean;
}

export function getElevationGradient(
  row: number,
  col: number,
  elevations: Map<string, number>,
  maxTraversableSlope?: number,
): ElevationGradient {
  function getElevation(r: number, c: number) {
    return (elevations.get(`${r}-${c}`) || 0) * ELEVATION_SCALE;
  }

  const zC = getElevation(row, col);
  const zTL = getElevation(row - 1, col - 1);
  const zT = getElevation(row - 1, col);
  const zTR = getElevation(row - 1, col + 1);
  const zL = getElevation(row, col - 1);
  const zR = getElevation(row, col + 1);
  const zBL = getElevation(row + 1, col - 1);
  const zB = getElevation(row + 1, col);
  const zBR = getElevation(row + 1, col + 1);

  const weight = 1 + 2 * INV_SQRT2;
  const zx = (zR + INV_SQRT2 * (zTR + zBR) - (zL + INV_SQRT2 * (zTL + zBL))) / weight;
  const zy = (zB + INV_SQRT2 * (zBL + zBR) - (zT + INV_SQRT2 * (zTL + zTR))) / weight;

  let magnitude = Math.sqrt(zx * zx + zy * zy);
  let angle = magnitude > TERRAIN_CONFIG.minGradientMagnitude ? Math.atan2(zy, zx) : 0;

  if (zC > 0) {
    const neighbors = [
      { dz: zR - zC, dx: 1, dy: 0, dist: 1.0 },
      { dz: zL - zC, dx: -1, dy: 0, dist: 1.0 },
      { dz: zB - zC, dx: 0, dy: 1, dist: 1.0 },
      { dz: zT - zC, dx: 0, dy: -1, dist: 1.0 },
      { dz: zTR - zC, dx: 1, dy: -1, dist: SQRT2 },
      { dz: zTL - zC, dx: -1, dy: -1, dist: SQRT2 },
      { dz: zBR - zC, dx: 1, dy: 1, dist: SQRT2 },
      { dz: zBL - zC, dx: -1, dy: 1, dist: SQRT2 },
    ];

    let maxSlope = 0;
    let maxDx = 0;
    let maxDy = 0;

    for (const n of neighbors) {
      const slope = Math.abs(n.dz) / n.dist;
      if (slope > maxSlope) {
        maxSlope = slope;
        maxDx = n.dz >= 0 ? n.dx : -n.dx;
        maxDy = n.dz >= 0 ? n.dy : -n.dy;
      }
    }

    if (maxSlope > magnitude) {
      magnitude = maxSlope;
      if (magnitude > TERRAIN_CONFIG.minGradientMagnitude) {
        angle = Math.atan2(maxDy, maxDx);
      }
    }
  }

  const slopeLimit = maxTraversableSlope ?? DEFAULT_MAX_TRAVERSABLE_SLOPE;
  const maxGradient =
    slopeLimit >= 90 ? Infinity : Math.tan((Math.max(0, slopeLimit) * Math.PI) / 180);
  const isUnstable = magnitude > maxGradient;

  return { zx, zy, magnitude, angle, isUnstable };
}

export interface GradientFieldEntry {
  angle: number;
  magnitude: number;
  isUnstable: boolean;
}

export function computeGradientField(
  rows: number,
  cols: number,
  elevations: Map<string, number>,
  maxTraversableSlope?: number,
): Map<string, GradientFieldEntry> {
  const field = new Map<string, GradientFieldEntry>();
  if (!elevations || elevations.size === 0) return field;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const grad = getElevationGradient(r, c, elevations, maxTraversableSlope);
      if (grad.magnitude > TERRAIN_CONFIG.minGradientMagnitude || grad.isUnstable) {
        field.set(`${r}-${c}`, {
          angle: grad.angle,
          magnitude: grad.magnitude,
          isUnstable: grad.isUnstable,
        });
      }
    }
  }
  return field;
}

function resolveElevations(
  source: Map<string, number> | { elevations: Map<string, number> },
): Map<string, number> {
  return source instanceof Map ? source : source.elevations;
}

export function getPosture(
  row: number,
  col: number,
  heading: Heading,
  source: Map<string, number> | { elevations: Map<string, number> },
): { roll: number; pitch: number } {
  if (heading === "NONE") return { roll: 0, pitch: 0 };

  const psi = HEADING_ANGLES[heading as Exclude<Heading, "NONE">];
  const elevations = resolveElevations(source);
  const { zx, zy } = getElevationGradient(row, col, elevations);

  const pitch = Math.atan(zx * Math.cos(psi) + zy * Math.sin(psi));
  const roll = Math.atan(zy * Math.cos(psi) - zx * Math.sin(psi));

  return { roll, pitch };
}

export function getGradientMagnitude(
  row: number,
  col: number,
  elevations: Map<string, number>,
): number {
  return getElevationGradient(row, col, elevations).magnitude;
}

export function isStablePosture(
  row: number,
  col: number,
  heading: Heading,
  scenario: Scenario,
): boolean {
  if (!scenario.robotPhysics) return true;

  const { roll, pitch } = getPosture(row, col, heading, scenario.elevations);
  const { trackWidth, wheelBase, comHeight, stabilityMargin } = scenario.robotPhysics;

  const xProj = comHeight * Math.tan(pitch);
  const yProj = comHeight * Math.tan(roll);

  const halfWidth = trackWidth / 2;
  const halfLength = wheelBase / 2;

  return (
    Math.abs(xProj) <= halfLength - stabilityMargin &&
    Math.abs(yProj) <= halfWidth - stabilityMargin
  );
}

/**
 * Calculates the vehicle center-of-mass stability penalty based on terrain roll and pitch.
 * Encapsulates asymmetric lateral roll vs longitudinal pitch risk factors.
 */
export function getStabilityPenalty(
  row: number,
  col: number,
  heading: Heading,
  scenario: Scenario,
  movementSubtotal: number,
): number {
  const { roll, pitch } = getPosture(row, col, heading, scenario.elevations);
  const { kRoll, kPitch, riskWeight } = ENERGY_CONFIG.stability;
  const riskFactor = Math.hypot(roll * kRoll, pitch * kPitch);
  return movementSubtotal * riskWeight * riskFactor;
}

export function getSlopeDegrees(
  current: { row: number; col: number },
  target: { row: number; col: number; heading: Heading },
  source: Map<string, number> | { elevations: Map<string, number> },
): number {
  const elevations = resolveElevations(source);
  const currentElevation = (elevations.get(`${current.row}-${current.col}`) || 0) * ELEVATION_SCALE;
  const targetElevation = (elevations.get(`${target.row}-${target.col}`) || 0) * ELEVATION_SCALE;
  const elevationDelta = targetElevation - currentElevation;

  return Math.atan(Math.abs(elevationDelta) / getStepDistance(target.heading)) * (180 / Math.PI);
}

/**
 * Calculates the nominal slope angle (in degrees) for a given elevation level
 * relative to flat ground across a single grid step.
 */
export function getElevationSlopeDegrees(elevationLevel: number, stepDistance = 1.0): number {
  return Math.atan((Math.abs(elevationLevel) * ELEVATION_SCALE) / stepDistance) * (180 / Math.PI);
}

/**
 * Calculates the elevation level required to achieve a nominal slope angle (in degrees)
 * relative to flat ground across a single grid step.
 */
export function getElevationFromSlopeDegrees(slopeDegrees: number, stepDistance = 1.0): number {
  const clamped = Math.max(0, Math.min(slopeDegrees, 90));
  if (clamped >= 90) {
    return 2292;
  }
  const radians = (clamped * Math.PI) / 180;
  return Number(((Math.tan(radians) * stepDistance) / ELEVATION_SCALE).toFixed(4));
}

export function isTraversableSlope(
  current: { row: number; col: number },
  target: { row: number; col: number; heading: Heading },
  scenario: Scenario,
  ignoreStability = false,
): boolean {
  const maxTraversableSlope =
    scenario.maxTraversableSlope ??
    scenario.robotPhysics?.maxTraversableSlope ??
    DEFAULT_MAX_TRAVERSABLE_SLOPE;
  const slopeDegrees = getSlopeDegrees(current, target, scenario.elevations);
  if (slopeDegrees > maxTraversableSlope) return false;

  if (ignoreStability) return true;

  const currentGrad = getElevationGradient(
    current.row,
    current.col,
    scenario.elevations,
    maxTraversableSlope,
  );
  if (currentGrad.isUnstable) return false;

  const { isUnstable } = getElevationGradient(
    target.row,
    target.col,
    scenario.elevations,
    maxTraversableSlope,
  );
  if (isUnstable) return false;

  return isStablePosture(target.row, target.col, target.heading, scenario);
}

export interface PathSafetyResult {
  isSafe: boolean;
  failureReason?: string;
  failureStep?: number;
  maxSlopeEncountered: number;
}

/**
 * Validates whether an entire path can be safely traversed by the robot
 * under physical constraints (slope limits, gradient stability, roll/pitch tipping).
 */
export function evaluatePathSafety(path: string[], scenario: Scenario): PathSafetyResult {
  if (!path || path.length === 0) {
    return {
      isSafe: false,
      failureReason: "NO_PATH_FOUND",
      maxSlopeEncountered: 0,
    };
  }

  const maxTraversableSlope =
    scenario.maxTraversableSlope ??
    scenario.robotPhysics?.maxTraversableSlope ??
    DEFAULT_MAX_TRAVERSABLE_SLOPE;

  const [startR, startC] = path[0].split("-").map(Number);
  const startGrad = getElevationGradient(startR, startC, scenario.elevations, maxTraversableSlope);
  if (startGrad.isUnstable) {
    return {
      isSafe: false,
      failureReason: "UNSTABLE_ELEVATION_GRADIENT",
      failureStep: 0,
      maxSlopeEncountered: 0,
    };
  }

  let maxSlopeEncountered = 0;

  for (let i = 1; i < path.length; i++) {
    const [prevR, prevC] = path[i - 1].split("-").map(Number);
    const [currR, currC] = path[i].split("-").map(Number);
    const heading = getHeading(path[i - 1], path[i]);
    const slope = getSlopeDegrees(
      { row: prevR, col: prevC },
      { row: currR, col: currC, heading },
      scenario.elevations,
    );
    if (slope > maxSlopeEncountered) {
      maxSlopeEncountered = slope;
    }

    const maxTraversableSlope =
      scenario.maxTraversableSlope ??
      scenario.robotPhysics?.maxTraversableSlope ??
      DEFAULT_MAX_TRAVERSABLE_SLOPE;
    if (slope > maxTraversableSlope) {
      return {
        isSafe: false,
        failureReason: `EXCEEDED_MAX_SLOPE (${slope.toFixed(1)}° > ${maxTraversableSlope}°)`,
        failureStep: i,
        maxSlopeEncountered,
      };
    }

    const { isUnstable } = getElevationGradient(
      currR,
      currC,
      scenario.elevations,
      maxTraversableSlope,
    );
    if (isUnstable) {
      return {
        isSafe: false,
        failureReason: "UNSTABLE_ELEVATION_GRADIENT",
        failureStep: i,
        maxSlopeEncountered,
      };
    }

    if (!isStablePosture(currR, currC, heading, scenario)) {
      return {
        isSafe: false,
        failureReason: "ROBOT_TIPOVER_RISK",
        failureStep: i,
        maxSlopeEncountered,
      };
    }
  }

  return { isSafe: true, maxSlopeEncountered };
}
