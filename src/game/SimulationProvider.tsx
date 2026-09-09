import { useState, useMemo, useEffect, useCallback, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useViewport } from "../hooks/useViewport";
import { SimulationEngine } from "./simulationEngine";
import { SimulationContext, type SimulationContextValue } from "./SimulationContext";
import type { AlgorithmType, BrushMode, Heading, Scenario } from "../shared/types";
import { GRID_CONFIG } from "../config/simulationConfig";

interface SimulationProviderProps {
  children: ReactNode;
}

export function SimulationProvider({ children }: SimulationProviderProps) {
  const viewport = useViewport();
  const [engine] = useState(() => {
    const defaultCellSize =
      viewport.width < GRID_CONFIG.mobileBreakpoint
        ? GRID_CONFIG.mobileCellSize
        : GRID_CONFIG.defaultCellSize;
    const initialCols = Math.floor(viewport.width / defaultCellSize);
    const initialRows = Math.floor(viewport.height / defaultCellSize);
    return new SimulationEngine({ cols: initialCols, rows: initialRows, cellSize: defaultCellSize });
  });

  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  const targetCellSize = state.isFixedDimensions
    ? Math.min(
        GRID_CONFIG.defaultCellSize,
        Math.max(12, Math.floor(Math.min(viewport.width - 24, viewport.height - 24) / 25)),
      )
    : viewport.width < GRID_CONFIG.mobileBreakpoint
      ? GRID_CONFIG.mobileCellSize
      : GRID_CONFIG.defaultCellSize;

  const cols = Math.floor(viewport.width / targetCellSize);
  const rows = Math.floor(viewport.height / targetCellSize);

  useEffect(() => {
    if (state.isFixedDimensions) {
      engine.setDimensions(state.cols, state.rows, targetCellSize);
    } else {
      engine.setDimensions(cols, rows, targetCellSize);
    }
  }, [engine, state.isFixedDimensions, state.cols, state.rows, cols, rows, targetCellSize]);

  useEffect(() => {
    return () => {
      engine.destroy();
    };
  }, [engine]);

  const setActiveBrush = useCallback((b: BrushMode) => engine.setActiveBrush(b), [engine]);
  const setElevationBrushValue = useCallback((v: number) => engine.setElevationBrushValue(v), [engine]);
  const setDirtBrushValue = useCallback((v: number) => engine.setDirtBrushValue(v), [engine]);
  const setWaterBrushValue = useCallback((v: number) => engine.setWaterBrushValue(v), [engine]);
  const setShowGradients = useCallback((s: boolean) => engine.setShowGradients(s), [engine]);
  const toggleGradients = useCallback(() => engine.toggleGradients(), [engine]);
  const setRobotHeading = useCallback((h: Heading) => engine.setRobotHeading(h), [engine]);
  const setSelectedAlgo = useCallback((a: AlgorithmType) => engine.setSelectedAlgo(a), [engine]);
  const toggleManhattanSearch = useCallback(() => engine.toggleManhattanSearch(), [engine]);
  const toggleEnergySearch = useCallback(() => engine.toggleEnergySearch(), [engine]);
  const handleMouseDown = useCallback((key: string) => engine.startPaint(key), [engine]);
  const handleMouseEnter = useCallback((key: string) => engine.continuePaint(key), [engine]);
  const handleMouseUp = useCallback(() => engine.endPaint(), [engine]);
  const visualize = useCallback((algo?: AlgorithmType) => engine.visualize(algo), [engine]);
  const solveInstantly = useCallback((algo?: AlgorithmType) => engine.solveInstantly(algo), [engine]);
  const walkPath = useCallback(() => engine.walk(), [engine]);
  const clearWalls = useCallback(() => engine.clearWalls(), [engine]);
  const clearAnimations = useCallback(() => engine.clearAnimations(), [engine]);
  const resetSimulation = useCallback(() => engine.reset(), [engine]);
  const loadScenario = useCallback(
    (scenario: Scenario, options?: { name?: string; instantSolve?: boolean }) =>
      engine.loadScenario(scenario, options),
    [engine],
  );
  const resetToFreeform = useCallback(() => {
    const freeformCellSize =
      viewport.width < GRID_CONFIG.mobileBreakpoint
        ? GRID_CONFIG.mobileCellSize
        : GRID_CONFIG.defaultCellSize;
    const freeformCols = Math.floor(viewport.width / freeformCellSize);
    const freeformRows = Math.floor(viewport.height / freeformCellSize);
    engine.resetToFreeform(freeformCols, freeformRows, freeformCellSize);
  }, [engine, viewport.width, viewport.height]);
  const getScenario = useCallback(() => engine.getScenario(), [engine]);

  const value: SimulationContextValue = useMemo(
    () => ({
      engine,
      ...state,
      wallNode: state.wallNodes,
      hasPath: Boolean(state.currentPath && state.currentPath.length > 0),
      setActiveBrush,
      setElevationBrushValue,
      setDirtBrushValue,
      setWaterBrushValue,
      setShowGradients,
      toggleGradients,
      setRobotHeading,
      setSelectedAlgo,
      handleSelectAlgo: setSelectedAlgo,
      toggleManhattanSearch,
      toggleEnergySearch,
      handleMouseDown,
      handleMouseEnter,
      handleMouseUp,
      visualize,
      solveInstantly,
      walkPath,
      clearWalls,
      clearAnimations,
      resetSimulation,
      loadScenario,
      resetToFreeform,
      getScenario,
    }),
    [
      engine,
      state,
      setActiveBrush,
      setElevationBrushValue,
      setDirtBrushValue,
      setWaterBrushValue,
      setShowGradients,
      toggleGradients,
      setRobotHeading,
      setSelectedAlgo,
      toggleManhattanSearch,
      toggleEnergySearch,
      handleMouseDown,
      handleMouseEnter,
      handleMouseUp,
      visualize,
      solveInstantly,
      walkPath,
      clearWalls,
      clearAnimations,
      resetSimulation,
      loadScenario,
      resetToFreeform,
      getScenario,
    ],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}
