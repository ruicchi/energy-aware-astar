import { TERRAIN_CONFIG, THEME_CONFIG } from "../config/simulationConfig";
import { getElevationSlopeDegrees } from "../physics/terrainPhysics";
import type { CellMutation } from "./scenarioTerrain";

export interface CellPreview {
  color: string;
  isWall?: boolean;
}

/**
 * Resolves transient DOM preview styles (background color and wall boundary class)
 * from a semantic domain mutation during pointer drawing strokes.
 */
export function resolveMutationPreview(mutation: CellMutation): CellPreview {
  if (mutation.layer === "wall") {
    return mutation.value
      ? { color: TERRAIN_CONFIG.types.wall.color, isWall: true }
      : { color: "transparent", isWall: false };
  }
  if (mutation.layer === "dirt") {
    return Number(mutation.value) !== 0
      ? { color: TERRAIN_CONFIG.types.dirt.color, isWall: false }
      : { color: "transparent", isWall: false };
  }
  if (mutation.layer === "water") {
    return Number(mutation.value) !== 0
      ? { color: TERRAIN_CONFIG.types.water.color, isWall: false }
      : { color: "transparent", isWall: false };
  }
  if (mutation.layer === "elevation") {
    return Number(mutation.value) > 0
      ? {
          color: TERRAIN_CONFIG.getElevationColor(Number(mutation.value)),
          isWall: false,
        }
      : { color: "transparent", isWall: false };
  }
  return { color: "transparent", isWall: false };
}

export interface GradientArrowDisplay {
  rotationDeg: number;
  opacity: number;
  isUnstable: boolean;
}

export interface CellDisplayState {
  bgColor: string;
  isWall: boolean;
  elevationLabel?: number;
  gradientArrow?: GradientArrowDisplay;
}

export interface ResolveCellDisplayParams {
  isWall: boolean;
  terrainFactor: number;
  terrainType?: "dirt" | "water";
  elevation: number;
  gradient?: { angle: number; magnitude: number; isUnstable: boolean } | null;
  showGradients?: boolean;
}

export function resolveCellDisplayState({
  isWall,
  terrainFactor,
  terrainType,
  elevation,
  gradient,
  showGradients,
}: ResolveCellDisplayParams): CellDisplayState {
  const isUnstable = gradient?.isUnstable ?? false;

  let bgColor = "transparent";
  if (isWall) {
    bgColor = TERRAIN_CONFIG.types.wall.color;
  } else if (isUnstable && showGradients) {
    bgColor = THEME_CONFIG.unstableOverlayColor;
  } else if (
    terrainType === "dirt" ||
    (!terrainType && terrainFactor === TERRAIN_CONFIG.types.dirt.cost)
  ) {
    bgColor = TERRAIN_CONFIG.types.dirt.color;
  } else if (
    terrainType === "water" ||
    (!terrainType && terrainFactor === TERRAIN_CONFIG.types.water.cost)
  ) {
    bgColor = TERRAIN_CONFIG.types.water.color;
  } else if (elevation > 0) {
    bgColor = TERRAIN_CONFIG.getElevationColor(elevation);
  }

  let gradientArrow: GradientArrowDisplay | undefined;
  if (
    showGradients &&
    gradient &&
    gradient.magnitude > TERRAIN_CONFIG.arrowDisplayThreshold &&
    !isWall
  ) {
    gradientArrow = {
      rotationDeg: gradient.angle * (180 / Math.PI) + 90,
      opacity: Math.min(1, gradient.magnitude / TERRAIN_CONFIG.arrowOpacityDivisor),
      isUnstable,
    };
  }

  const elevationLabel =
    elevation > 0 && !isWall && terrainFactor === 0
      ? Math.round(getElevationSlopeDegrees(elevation))
      : undefined;

  return {
    bgColor,
    isWall,
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
}

/**
 * Pure coordinate resolution for the kinematic robot actor.
 * Retains the final destination position when traversal has completed,
 * while anchoring to the designated start node when idle or commencing search.
 */
export function resolveRobotCoordinates(params: {
  hasFinishedWalking: boolean;
  currentPath: readonly string[] | null;
  walkingStep: number;
  robotNode: string;
}): [number, number] {
  if (
    params.hasFinishedWalking &&
    params.currentPath &&
    params.walkingStep >= 0 &&
    params.walkingStep < params.currentPath.length
  ) {
    const parts = params.currentPath[params.walkingStep].split("-");
    return [Number(parts[0]), Number(parts[1])];
  }
  const parts = params.robotNode.split("-");
  return [Number(parts[0]), Number(parts[1])];
}
