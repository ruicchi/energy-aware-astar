import type { Heading, RobotPhysicsConfig } from "../shared/types";

export interface VehicleConfig extends RobotPhysicsConfig {
  defaultHeading: Heading;
}

export const VEHICLE_CONFIG: VehicleConfig = {
  defaultHeading: "RIGHT",
  trackWidth: 0.8,
  wheelBase: 1.2,
  comHeight: 0.6,
  stabilityMargin: 0.05,
};

export const PHYSICS_MATH = {
  SQRT2: 1.414,
  INV_SQRT2: 1 / Math.sqrt(2),
};

export const TERRAIN_CONFIG = {
  elevationScale: 0.5,
  defaultMaxTraversableSlope: 45,
  maxStableGradient: 1.0,
  types: {
    flat: { cost: 0, color: "transparent" },
    dirt: { cost: 0.5, color: "#d2b48c" },
    water: { cost: 0.1, color: "#00ffff" },
    wall: { color: "#1a88e2" },
  },
  getElevationColor: (level: number): string => {
    if (level <= 0) return "";
    const brightness = Math.max(0, 255 - level * 20);
    return `rgb(0, ${brightness}, 0)`;
  },
} as const;

export const ENERGY_CONFIG = {
  climbingFactor: 1.5,
  turnPenalty: 1.0,
} as const;

export const ANIMATION_CONFIG = {
  searchStepDelayMs: 10,
  pathStepDelayMs: 30,
  walkStepDelayMs: 200,
  walkRotateDelayMs: 300,
} as const;

export const THEME_CONFIG = {
  robotColor: "#4caf50",
  destinationColor: "#f44336",
  unstableOverlayColor: "rgba(255, 0, 0, 0.3)",
  unstableArrowColor: "#ff5252",
  contourArrowColor: "rgba(0, 0, 0, 0.4)",
} as const;
