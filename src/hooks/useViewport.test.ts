import { describe, it, expect } from "vitest";
import {
  resolveBreakpointFlags,
  calculateGridDimensions,
  calculateFixedGridCellSize,
} from "./useViewport";
import { GRID_CONFIG } from "../config/simulationConfig";

describe("Simulation Viewport Seam", () => {
  describe("resolveBreakpointFlags", () => {
    it("identifies desktop viewports above mobile breakpoint", () => {
      expect(resolveBreakpointFlags(1200)).toEqual({
        isMobile: false,
        isTiny: false,
      });

      expect(resolveBreakpointFlags(GRID_CONFIG.mobileBreakpoint)).toEqual({
        isMobile: false,
        isTiny: false,
      });
    });

    it("identifies mobile viewports below mobile breakpoint", () => {
      expect(resolveBreakpointFlags(599)).toEqual({
        isMobile: true,
        isTiny: false,
      });

      expect(resolveBreakpointFlags(401)).toEqual({
        isMobile: true,
        isTiny: false,
      });
    });

    it("identifies tiny viewports below or equal to 400px", () => {
      expect(resolveBreakpointFlags(400)).toEqual({
        isMobile: true,
        isTiny: true,
      });

      expect(resolveBreakpointFlags(320)).toEqual({
        isMobile: true,
        isTiny: true,
      });
    });
  });

  describe("calculateGridDimensions", () => {
    it("computes desktop grid capacity with default cell size", () => {
      // 1120 / 28 = 40 cols, 700 / 28 = 25 rows
      const dims = calculateGridDimensions(1120, 700);
      expect(dims).toEqual({
        cols: 40,
        rows: 25,
        cellSize: GRID_CONFIG.defaultCellSize,
        isMobile: false,
        isTiny: false,
      });
    });

    it("computes mobile grid capacity with mobile cell size", () => {
      // 500 / 20 = 25 cols, 800 / 20 = 40 rows
      const dims = calculateGridDimensions(500, 800);
      expect(dims).toEqual({
        cols: 25,
        rows: 40,
        cellSize: GRID_CONFIG.mobileCellSize,
        isMobile: true,
        isTiny: false,
      });
    });

    it("computes tiny grid capacity with mobile cell size and tiny flag", () => {
      // 360 / 20 = 18 cols, 600 / 20 = 30 rows
      const dims = calculateGridDimensions(360, 600);
      expect(dims).toEqual({
        cols: 18,
        rows: 30,
        cellSize: GRID_CONFIG.mobileCellSize,
        isMobile: true,
        isTiny: true,
      });
    });

    it("enforces minimum of 1 row and 1 column for microscopic viewports", () => {
      const dims = calculateGridDimensions(10, 10);
      expect(dims.cols).toBe(1);
      expect(dims.rows).toBe(1);
    });
  });

  describe("calculateFixedGridCellSize", () => {
    it("caps cell size at defaultCellSize when ample viewport space is available", () => {
      // (1200 - 24) / 25 = 47 -> capped at 28
      const size = calculateFixedGridCellSize(1200, 800, 25, 25);
      expect(size).toBe(GRID_CONFIG.defaultCellSize);
    });

    it("scales cell size down when viewport space is constrained", () => {
      // (400 - 24) / 25 = 376 / 25 = 15.04 -> floor is 15
      const size = calculateFixedGridCellSize(400, 400, 25, 25);
      expect(size).toBe(15);
    });

    it("clamps cell size to minimum floor of 12px when viewport is severely constrained", () => {
      // (100 - 24) / 25 = 76 / 25 = 3 -> clamped to 12
      const size = calculateFixedGridCellSize(100, 100, 25, 25);
      expect(size).toBe(12);
    });

    it("safely handles 0 rows/cols without division by zero errors", () => {
      const size = calculateFixedGridCellSize(500, 500, 0, 0);
      expect(size).toBe(GRID_CONFIG.defaultCellSize);
    });
  });
});
