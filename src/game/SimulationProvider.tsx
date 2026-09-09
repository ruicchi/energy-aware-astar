import { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useViewport } from "../hooks/useViewport";
import { SimulationEngine } from "./simulationEngine";
import { SimulationContext, type SimulationContextValue } from "./SimulationContext";

interface SimulationProviderProps {
  children: ReactNode;
}

export const SimulationProvider = ({ children }: SimulationProviderProps) => {
  const viewport = useViewport();
  const cellSize = viewport.width < 600 ? 20 : 28;
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

  const value: SimulationContextValue = useMemo(
    () => ({
      engine,
      ...state,
      wallNode: state.wallNodes,
      hasPath: Boolean(state.currentPath && state.currentPath.length > 0),
      setActiveBrush: (b) => engine.setActiveBrush(b),
      setElevationBrushValue: (v) => engine.setElevationBrushValue(v),
      setDirtBrushValue: (v) => engine.setDirtBrushValue(v),
      setWaterBrushValue: (v) => engine.setWaterBrushValue(v),
      setShowGradients: (s) => engine.setShowGradients(s),
      toggleGradients: () => engine.toggleGradients(),
      setRobotHeading: (h) => engine.setRobotHeading(h),
      setSelectedAlgo: (a) => engine.setSelectedAlgo(a),
      handleSelectAlgo: (a) => engine.setSelectedAlgo(a),
      toggleManhattanSearch: () => engine.toggleManhattanSearch(),
      toggleEnergySearch: () => engine.toggleEnergySearch(),
      handleMouseDown: (key) => engine.startPaint(key),
      handleMouseEnter: (key) => engine.continuePaint(key),
      handleMouseUp: () => engine.endPaint(),
      visualize: (algo) => engine.visualize(algo),
      walkPath: () => engine.walk(),
      clearWalls: () => engine.clearWalls(),
      clearAnimations: () => engine.clearAnimations(),
      resetSimulation: () => engine.reset(),
      getScenario: () => engine.getScenario(),
    }),
    [engine, state],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};
