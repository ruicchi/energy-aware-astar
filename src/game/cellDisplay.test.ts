import { describe, it, expect } from "vitest";
import { resolveCellDisplayState, resolveMutationPreview } from "./cellDisplay";
import { TERRAIN_CONFIG, THEME_CONFIG } from "../config/simulationConfig";

describe("Cell Display Resolver", () => {
  const baseParams = {
    isWall: false,
    terrainFactor: 0,
    elevation: 0,
  };

  it("resolves default transparent cell styling", () => {
    const defaultState = resolveCellDisplayState(baseParams);
    expect(defaultState.bgColor).toBe("transparent");
    expect(defaultState.isWall).toBe(false);
    expect(defaultState.elevationLabel).toBeUndefined();
    expect(defaultState.gradientArrow).toBeUndefined();
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

  it("resolves elevation coloring and label in slope degrees", () => {
    const elevationState = resolveCellDisplayState({
      ...baseParams,
      elevation: 5,
    });
    expect(elevationState.bgColor).toBe(TERRAIN_CONFIG.getElevationColor(5));
    expect(elevationState.elevationLabel).toBe(68);

    const slope30State = resolveCellDisplayState({
      ...baseParams,
      elevation: 1.1547,
    });
    expect(slope30State.elevationLabel).toBe(30);
  });

  it("omits elevation label when terrain factor is non-zero or cell is a wall", () => {
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

  it("suppresses gradient arrows when cell is a wall", () => {
    const wallWithGrad = resolveCellDisplayState({
      ...baseParams,
      isWall: true,
      showGradients: true,
      gradient: { angle: 0, magnitude: 0.8, isUnstable: false },
    });
    expect(wallWithGrad.gradientArrow).toBeUndefined();
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

  describe("resolveMutationPreview", () => {
    it("resolves wall layer mutations", () => {
      expect(resolveMutationPreview({ key: "1-1", layer: "wall", value: true })).toEqual({
        color: TERRAIN_CONFIG.types.wall.color,
        isWall: true,
      });

      expect(resolveMutationPreview({ key: "1-1", layer: "wall", value: false })).toEqual({
        color: "transparent",
        isWall: false,
      });
    });

    it("resolves dirt layer mutations", () => {
      expect(
        resolveMutationPreview({
          key: "1-1",
          layer: "dirt",
          value: TERRAIN_CONFIG.types.dirt.cost,
        }),
      ).toEqual({
        color: TERRAIN_CONFIG.types.dirt.color,
        isWall: false,
      });

      expect(resolveMutationPreview({ key: "1-1", layer: "dirt", value: 0 })).toEqual({
        color: "transparent",
        isWall: false,
      });
    });

    it("resolves water layer mutations", () => {
      expect(
        resolveMutationPreview({
          key: "1-1",
          layer: "water",
          value: TERRAIN_CONFIG.types.water.cost,
        }),
      ).toEqual({
        color: TERRAIN_CONFIG.types.water.color,
        isWall: false,
      });

      expect(resolveMutationPreview({ key: "1-1", layer: "water", value: 0 })).toEqual({
        color: "transparent",
        isWall: false,
      });
    });

    it("resolves elevation layer mutations", () => {
      expect(resolveMutationPreview({ key: "1-1", layer: "elevation", value: 4 })).toEqual({
        color: TERRAIN_CONFIG.getElevationColor(4),
        isWall: false,
      });

      expect(resolveMutationPreview({ key: "1-1", layer: "elevation", value: 0 })).toEqual({
        color: "transparent",
        isWall: false,
      });
    });
  });
});
