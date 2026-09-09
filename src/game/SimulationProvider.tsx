import { useState, useMemo, useEffect, useCallback, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useViewport } from "../hooks/useViewport";
import { SimulationEngine } from "./simulationEngine";
import { SimulationContext, type SimulationContextValue } from "./SimulationContext";
import type { AlgorithmType, BrushMode, Heading } from "../shared/types";
import { GRID_CONFIG } from "../config/simulationConfig";

interface SimulationProviderProps {
  children: ReactNode;
}

export function SimulationProvider({ children }: SimulationProviderProps) {
  const viewport = useViewport();
  const cellSize =
    viewport.width < GRID_CONFIG.mobileBreakpoint
      ? GRID_CONFIG.mobileCellSize
      : GRID_CONFIG.defaultCellSize;
  const cols = Math.floor(viewport.width / cellSize);
  const rows = Math.floor(viewport.height / cellSize);

  const [engine] = useState(() => new SimulationEngine({ cols, rows, cellSize }));

  useEffect(() => {
    engine.setDimensions(cols, rows, cellSize);
  }, [engine, cols, rows, cellSize]);

  useEffect(() => {
    return () => {
      engine.destroy();
    };
  }, [engine]);

  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

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
  const walkPath = useCallback(() => engine.walk(), [engine]);
  const clearWalls = useCallback(() => engine.clearWalls(), [engine]);
  const clearAnimations = useCallback(() => engine.clearAnimations(), [engine]);
  const resetSimulation = useCallback(() => engine.reset(), [engine]);
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
      walkPath,
      clearWalls,
      clearAnimations,
      resetSimulation,
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
      walkPath,
      clearWalls,
      clearAnimations,
      resetSimulation,
      getScenario,
    ],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};
