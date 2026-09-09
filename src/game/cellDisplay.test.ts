import { describe, it, expect } from "vitest";
import { resolveCellDisplayState } from "./cellDisplay";
import { TERRAIN_CONFIG, THEME_CONFIG } from "../config/simulationConfig";

describe("Cell Display Resolver", () => {
  const baseParams = {
    isWall: false,
    isRobot: false,
    isDestination: false,
    terrainFactor: 0,
    elevation: 0,
  };

  it("prioritizes robot and destination colors", () => {
    const robotState = resolveCellDisplayState({
      ...baseParams,
      isRobot: true,
      robotHeading: "UP",
    });
    expect(robotState.bgColor).toBe(THEME_CONFIG.robotColor);
    expect(robotState.isRobot).toBe(true);
    expect(robotState.robotHeading).toBe("UP");

    const destState = resolveCellDisplayState({
      ...baseParams,
      isDestination: true,
    });
    expect(destState.bgColor).toBe(THEME_CONFIG.destinationColor);
    expect(destState.isDestination).toBe(true);
  });

  it("resolves wall styling", () => {
    const wallState = resolveCellDisplayState({
      ...baseParams,
      isWall: true,
    });
    expect(wallState.bgColor).toBe(TERRAIN_CONFIG.types.wall.color);
    expect(wallState.isWall).toBe(true);
  });

  it("resolves terrain types dirt and water", () => {
    const dirtState = resolveCellDisplayState({
      ...baseParams,
      terrainType: "dirt",
      terrainFactor: TERRAIN_CONFIG.types.dirt.cost,
    });
    expect(dirtState.bgColor).toBe(TERRAIN_CONFIG.types.dirt.color);

    const waterState = resolveCellDisplayState({
      ...baseParams,
      terrainType: "water",
      terrainFactor: TERRAIN_CONFIG.types.water.cost,
    });
    expect(waterState.bgColor).toBe(TERRAIN_CONFIG.types.water.color);
  });

  it("resolves elevation coloring and label", () => {
    const elevationState = resolveCellDisplayState({
      ...baseParams,
      elevation: 5,
    });
    expect(elevationState.bgColor).toBe(TERRAIN_CONFIG.getElevationColor(5));
    expect(elevationState.elevationLabel).toBe(5);
  });

  it("omits elevation label when terrain factor is non-zero or cell is robot/destination/wall", () => {
    const terrainWithElevation = resolveCellDisplayState({
      ...baseParams,
      elevation: 5,
      terrainFactor: 3,
    });
    expect(terrainWithElevation.elevationLabel).toBeUndefined();

    const wallWithElevation = resolveCellDisplayState({
      ...baseParams,
      elevation: 5,
      isWall: true,
    });
    expect(wallWithElevation.elevationLabel).toBeUndefined();
  });

  it("resolves gradient arrows when showGradients is true and magnitude > 0.1", () => {
    const gradientState = resolveCellDisplayState({
      ...baseParams,
      showGradients: true,
      gradient: {
        angle: 0,
        magnitude: 0.8,
        isUnstable: false,
      },
    });
    expect(gradientState.gradientArrow).toBeDefined();
    expect(gradientState.gradientArrow?.rotationDeg).toBe(90); // 0 rad * 180/pi + 90
    expect(gradientState.gradientArrow?.opacity).toBe(0.4); // 0.8 / 2
    expect(gradientState.gradientArrow?.isUnstable).toBe(false);
  });

  it("suppresses gradient arrows when cell is robot, destination, or wall", () => {
    const robotWithGrad = resolveCellDisplayState({
      ...baseParams,
      isRobot: true,
      showGradients: true,
      gradient: { angle: 0, magnitude: 0.8, isUnstable: false },
    });
    expect(robotWithGrad.gradientArrow).toBeUndefined();
  });

  it("applies unstable overlay when gradient is unstable and showGradients is true", () => {
    const unstableState = resolveCellDisplayState({
      ...baseParams,
      showGradients: true,
      gradient: {
        angle: 0,
        magnitude: 1.2,
        isUnstable: true,
      },
    });
    expect(unstableState.bgColor).toBe(THEME_CONFIG.unstableOverlayColor);
    expect(unstableState.gradientArrow?.isUnstable).toBe(true);
  });
});
