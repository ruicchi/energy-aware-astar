import { createContext, useContext } from "react";
import type {
  Scenario,
  Heading,
  BrushMode,
  AlgorithmType,
} from "../shared/types";
import type { SimulationEngine, SimulationState } from "./simulationEngine";

export interface SimulationContextValue extends SimulationState {
  engine: SimulationEngine;
  wallNode: Set<string>; // Alias for wallNodes for backward compatibility
  hasPath: boolean;

  setActiveBrush: (brush: BrushMode) => void;
  setElevationBrushValue: (val: number) => void;
  setDirtBrushValue: (val: number) => void;
  setWaterBrushValue: (val: number) => void;
  setShowGradients: (show: boolean) => void;
  toggleGradients: () => void;

  setRobotHeading: (heading: Heading) => void;
  setSelectedAlgo: (algo: AlgorithmType) => void;
  handleSelectAlgo: (algo: AlgorithmType) => void;

  toggleManhattanSearch: () => void;
  toggleEnergySearch: () => void;

  handleMouseDown: (key: string) => void;
  handleMouseEnter: (key: string) => void;
  handleMouseUp: () => void;

  visualize: (algo?: AlgorithmType) => void;
  walkPath: () => void;
  clearWalls: () => void;
  clearAnimations: () => void;
  resetSimulation: () => void;
  getScenario: () => Scenario;
}

export const SimulationContext = createContext<SimulationContextValue | null>(null);

export const useSimulation = (): SimulationContextValue => {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return ctx;
};
