import type { Heading } from "../shared/types";
import { TERRAIN_CONFIG, THEME_CONFIG } from "../config/simulationConfig";

export interface GradientArrowDisplay {
  rotationDeg: number;
  opacity: number;
  isUnstable: boolean;
}

export interface CellDisplayState {
  bgColor: string;
  isWall: boolean;
  isRobot: boolean;
  isDestination: boolean;
  robotHeading?: Heading;
  elevationLabel?: number;
  gradientArrow?: GradientArrowDisplay;
}

export interface ResolveCellDisplayParams {
  isWall: boolean;
  isRobot: boolean;
  isDestination: boolean;
  terrainFactor: number;
  terrainType?: "dirt" | "water";
  elevation: number;
  robotHeading?: Heading;
  gradient?: { angle: number; magnitude: number; isUnstable: boolean } | null;
  showGradients?: boolean;
}

export function resolveCellDisplayState({
  isWall,
  isRobot,
  isDestination,
  terrainFactor,
  terrainType,
  elevation,
  robotHeading,
  gradient,
  showGradients,
}: ResolveCellDisplayParams): CellDisplayState {
  const isUnstable = gradient?.isUnstable ?? false;

  let bgColor = "transparent";
  if (isRobot) {
    bgColor = THEME_CONFIG.robotColor;
  } else if (isDestination) {
    bgColor = THEME_CONFIG.destinationColor;
  } else if (isWall) {
    bgColor = TERRAIN_CONFIG.types.wall.color;
  } else if (isUnstable && showGradients) {
    bgColor = THEME_CONFIG.unstableOverlayColor;
  } else if (terrainType === "dirt" || (!terrainType && terrainFactor === TERRAIN_CONFIG.types.dirt.cost)) {
    bgColor = TERRAIN_CONFIG.types.dirt.color;
  } else if (terrainType === "water" || (!terrainType && terrainFactor === TERRAIN_CONFIG.types.water.cost)) {
    bgColor = TERRAIN_CONFIG.types.water.color;
  } else if (elevation > 0) {
    bgColor = TERRAIN_CONFIG.getElevationColor(elevation);
  }

  let gradientArrow: GradientArrowDisplay | undefined;
  if (
    showGradients &&
    gradient &&
    gradient.magnitude > 0.1 &&
    !isRobot &&
    !isDestination &&
    !isWall
  ) {
    gradientArrow = {
      rotationDeg: gradient.angle * (180 / Math.PI) + 90,
      opacity: Math.min(1, gradient.magnitude / 2),
      isUnstable,
    };
  }

  const elevationLabel =
    elevation > 0 && !isRobot && !isDestination && !isWall && terrainFactor === 0
      ? elevation
      : undefined;

  return {
    bgColor,
    isWall,
    isRobot,
    isDestination,
    robotHeading: isRobot ? robotHeading : undefined,
    elevationLabel,
    gradientArrow,
  };
}

export interface CellComparisonProps {
  cellSize: number;
  displayState: CellDisplayState;
}

export function areCellDisplayPropsEqual(
  prevProps: CellComparisonProps,
  nextProps: CellComparisonProps,
): boolean {
  if (prevProps.cellSize !== nextProps.cellSize) {
    return false;
  }

  const prev = prevProps.displayState;
  const next = nextProps.displayState;

  if (
    prev.bgColor !== next.bgColor ||
    prev.isWall !== next.isWall ||
    prev.isRobot !== next.isRobot ||
    prev.isDestination !== next.isDestination ||
    prev.robotHeading !== next.robotHeading ||
    prev.elevationLabel !== next.elevationLabel
  ) {
    return false;
  }

  const prevArrow = prev.gradientArrow;
  const nextArrow = next.gradientArrow;
  if (!prevArrow && !nextArrow) return true;
  if (!prevArrow || !nextArrow) return false;

  return (
    prevArrow.rotationDeg === nextArrow.rotationDeg &&
    prevArrow.opacity === nextArrow.opacity &&
    prevArrow.isUnstable === nextArrow.isUnstable
  );
};
