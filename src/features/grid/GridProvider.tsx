import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { BrushMode } from "../../shared/types";

interface GridContextType {
  walls: Set<string>;
  setWalls: (walls: Set<string>) => void;
  terrainFactors: Map<string, number>;
  setTerrainFactors: (factors: Map<string, number>) => void;
  elevations: Map<string, number>;
  setElevations: (elevations: Map<string, number>) => void;
  robotNode: string;
  setRobotNode: (node: string) => void;
  destinationNode: string;
  setDestinationNode: (node: string) => void;
  activeBrush: BrushMode;
  setActiveBrush: (brush: BrushMode) => void;
  elevationBrushValue: number;
  setElevationBrushValue: (val: number) => void;
}

const GridContext = createContext<GridContextType | null>(null);

export const useGridContext = () => {
  const ctx = useContext(GridContext);
  if (!ctx) throw new Error("useGridContext must be used within GridProvider");
  return ctx;
};

export const GridProvider = ({ children }: { children: ReactNode }) => {
  const [walls, setWalls] = useState<Set<string>>(new Set());
  const [terrainFactors, setTerrainFactors] = useState<Map<string, number>>(new Map());
  const [elevations, setElevations] = useState<Map<string, number>>(new Map());
  const [robotNode, setRobotNode] = useState("10-10");
  const [destinationNode, setDestinationNode] = useState("10-30");
  const [activeBrush, setActiveBrush] = useState<BrushMode>("wall");
  const [elevationBrushValue, setElevationBrushValue] = useState(5);

  return (
    <GridContext.Provider
      value={{
        walls,
        setWalls,
        terrainFactors,
        setTerrainFactors,
        elevations,
        setElevations,
        robotNode,
        setRobotNode,
        destinationNode,
        setDestinationNode,
        activeBrush,
        setActiveBrush,
        elevationBrushValue,
        setElevationBrushValue,
      }}
    >
      {children}
    </GridContext.Provider>
  );
};
