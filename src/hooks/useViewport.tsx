import { useState, useEffect, useCallback, useMemo } from "react";
import { GRID_CONFIG } from "../config/simulationConfig";

/**
 * Geometric dimensions and breakpoint classification for the simulation grid.
 */
export interface GridDimensions {
  cols: number;
  rows: number;
  cellSize: number;
  isMobile: boolean;
  isTiny: boolean;
}

/**
 * Deep viewport interface packaging raw dimensions, responsive breakpoints,
 * computed grid capacity, and fixed-scenario cell clamping logic.
 */
export interface SimulationViewport extends GridDimensions {
  width: number;
  height: number;
  calculateFixedCellSize: (cols: number, rows: number) => number;
}

/**
 * Pure helper resolving responsive breakpoint flags from a given viewport width.
 */
export function resolveBreakpointFlags(width: number): { isMobile: boolean; isTiny: boolean } {
  const isMobile = width < GRID_CONFIG.mobileBreakpoint;
  const isTiny = width <= 400;
  return { isMobile, isTiny };
}

/**
 * Pure calculation computing responsive grid columns, rows, and cell dimensions
 * based on viewport boundaries and standard breakpoints.
 */
export function calculateGridDimensions(width: number, height: number): GridDimensions {
  const { isMobile, isTiny } = resolveBreakpointFlags(width);
  const cellSize = isMobile ? GRID_CONFIG.mobileCellSize : GRID_CONFIG.defaultCellSize;
  const cols = Math.max(1, Math.floor(width / cellSize));
  const rows = Math.max(1, Math.floor(height / cellSize));

  return {
    cols,
    rows,
    cellSize,
    isMobile,
    isTiny,
  };
}

/**
 * Pure calculation determining optimal cell size for fixed-dimension scenarios,
 * clamping within allowed min/max thresholds while maintaining full grid visibility.
 */
export function calculateFixedGridCellSize(
  viewportWidth: number,
  viewportHeight: number,
  cols: number,
  rows: number,
): number {
  const maxDim = Math.max(cols, rows, 1);
  const availableSpace = Math.min(viewportWidth - 24, viewportHeight - 24);
  const rawSize = Math.floor(availableSpace / maxDim);
  return Math.min(GRID_CONFIG.defaultCellSize, Math.max(12, rawSize));
}

/**
 * Deep viewport hook providing unified responsive grid metrics, debounced resize tracking,
 * and breakpoint classification for the simulation workspace.
 */
export function useViewport(): SimulationViewport {
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: ReturnType<typeof setTimeout>;

    function onResize() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, GRID_CONFIG.resizeDebounceMs);
    }

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const grid = useMemo(
    () => calculateGridDimensions(dimensions.width, dimensions.height),
    [dimensions.width, dimensions.height],
  );

  const calculateFixedCellSize = useCallback(
    (cols: number, rows: number) =>
      calculateFixedGridCellSize(dimensions.width, dimensions.height, cols, rows),
    [dimensions.width, dimensions.height],
  );

  return useMemo(
    () => ({
      width: dimensions.width,
      height: dimensions.height,
      ...grid,
      calculateFixedCellSize,
    }),
    [dimensions.width, dimensions.height, grid, calculateFixedCellSize],
  );
}
