import type { Heading, RobotPhysicsConfig } from "../shared/types";

export interface VehicleConfig extends RobotPhysicsConfig {
  defaultHeading: Heading;
}

export const VEHICLE_CONFIG: VehicleConfig = {
  defaultHeading: "NONE",
  trackWidth: 0.8,
  wheelBase: 1.2,
  comHeight: 0.6,
  stabilityMargin: 0.05,
};

export const TERRAIN_CONFIG = {
  elevationScale: 0.5,
  defaultMaxTraversableSlope: 45,
  maxStableGradient: 1.0,
  minGradientMagnitude: 0.05,
  arrowDisplayThreshold: 0.1,
  arrowOpacityDivisor: 2,
  types: {
    flat: { cost: 0, color: "transparent" },
    dirt: { cost: 0.5, color: "#d2b48c" },
    water: { cost: 0.1, color: "#00ffff" },
    wall: { color: "#1a88e2" },
  },
  getElevationColor(level: number): string {
    if (level <= 0) return "";
    const brightness = Math.max(0, 255 - level * 20);
    return `rgb(0, ${brightness}, 0)`;
  },
} as const;

export const ENERGY_CONFIG = {
  climbingFactor: 1.5,
  turnPenalty: 1.0,
  maxVelocityDivisor: 2, // S_MAX translational heuristic divisor
  excessiveSlopeThreshold: 30, // Degrees above which excessive slope climbing penalty is applied
  excessiveSlopePenaltyMultiplier: 20.0,
  stability: {
    kRoll: 3.0, // Asymmetric lateral tipping risk weight
    kPitch: 1.0, // Longitudinal tipping risk weight
    riskWeight: 2.0, // Multiplier for stability penalty
  },
} as const;

export const ANIMATION_CONFIG = {
  searchStepDelayMs: 10,
  pathStepDelayMs: 30,
  walkStepDelayMs: 200,
  walkRotateDelayMs: 300,
} as const;

export const GRID_CONFIG = {
  defaultCols: 40,
  defaultRows: 25,
  defaultCellSize: 28,
  mobileBreakpoint: 600,
  mobileCellSize: 20,
  resizeDebounceMs: 150,
} as const;

export const BRUSH_CONFIG = {
  dirt: {
    min: 0.1,
    max: 5.0,
    step: 0.1,
    defaultValue: TERRAIN_CONFIG.types.dirt.cost,
  },
  water: {
    min: 0.1,
    max: 5.0,
    step: 0.1,
    defaultValue: TERRAIN_CONFIG.types.water.cost,
  },
  elevation: {
    min: 1,
    max: 10,
    step: 1,
    defaultValue: 5,
  },
} as const;

export const UI_CONFIG = {
  initialPosition: { x: 20, y: 20 },
  panelWidth: {
    tiny: 160,
    mobile: 180,
    default: 220,
    manual: 580,
    metrics: 280,
    metricsMobile: 220,
  },
  zIndex: {
    polyline: 5,
    actors: 10,
    panels: 1000,
    modal: 1100,
  },
  elevation: {
    panel: 4,
    modal: 6,
  },
  dragBounds: {
    minX: 10,
    minY: 10,
    paddingX: 60,
    paddingY: 50,
  },
} as const;

export const THEME_CONFIG = {
  robotColor: "#4caf50",
  destinationColor: "#f44336",
  unstableOverlayColor: "rgba(255, 0, 0, 0.3)",
  unstableArrowColor: "#ff5252",
  contourArrowColor: "rgba(0, 0, 0, 0.4)",
  pathLineColor: "#fffe6a",
  gridBackgroundColor: "#f2f2f2",
  cellBorderColor: "#b8b8b8",
  actorBorderColor: "rgba(0, 0, 0, 0.2)",
  panelBackgroundColor: "rgba(255, 255, 255, 0.4)",
  panelHeaderBorderColor: "rgba(0, 0, 0, 0.1)",
  failureBackgroundColor: "rgba(244, 67, 54, 0.15)",
  failureBorderColor: "#f44336",
} as const;

export const PROCEDURAL_CONFIG = {
  defaultRows: 25,
  defaultCols: 25,
  defaultStartNode: "2-2",
  defaultHeading: "NONE" as Heading,
  defaultNumHills: 3,
  defaultNumMudPatches: 3,
  defaultObstacleDensity: 0.05,
  maxTraversableSlope: 30,
  protectedRadius: 2.5,
  waterProbability: 0.4,
  hills: {
    minPeakHeight: 3,
    peakHeightVariance: 5,
    minRadius: 2,
    radiusVariance: 3,
  },
  mud: {
    minRadius: 1.5,
    radiusVariance: 2.5,
    waterFactorBase: 6.0,
    waterFactorVariance: 3.0,
    dirtFactorBase: 2.5,
    dirtFactorVariance: 2.5,
  },
} as const;

export function getHeadingRotation(heading: Heading): string {
  switch (heading) {
    case "UP":
      return "-90deg";
    case "DOWN":
      return "90deg";
    case "LEFT":
      return "180deg";
    case "RIGHT":
      return "0deg";
    case "UP_LEFT":
      return "-135deg";
    case "UP_RIGHT":
      return "-45deg";
    case "DOWN_LEFT":
      return "135deg";
    case "DOWN_RIGHT":
      return "45deg";
    default:
      return "0deg";
  }
}
