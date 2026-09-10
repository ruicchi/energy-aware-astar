import { useState, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useViewport } from "../hooks/useViewport";
import { SimulationEngine } from "./simulationEngine";
import { GRID_CONFIG } from "../config/simulationConfig";
import { SimulationEngineContext } from "./simulationHooks";

export interface SimulationProviderProps {
  children: ReactNode;
  engine?: SimulationEngine;
}

export function SimulationProvider({ children, engine: externalEngine }: SimulationProviderProps) {
  const viewport = useViewport();
  const [internalEngine] = useState(() => {
    if (externalEngine) return externalEngine;
    const defaultCellSize =
      viewport.width < GRID_CONFIG.mobileBreakpoint
        ? GRID_CONFIG.mobileCellSize
        : GRID_CONFIG.defaultCellSize;
    const initialCols = Math.floor(viewport.width / defaultCellSize);
    const initialRows = Math.floor(viewport.height / defaultCellSize);
    return new SimulationEngine({
      cols: initialCols,
      rows: initialRows,
      cellSize: defaultCellSize,
    });
  });

  const engine = externalEngine ?? internalEngine;

  const isFixedDimensions = useSyncExternalStore(
    engine.subscribe,
    () => engine.getSnapshot().isFixedDimensions,
  );

  // Keep grid dimensions synchronized with responsive viewport
  useEffect(() => {
    const snapshot = engine.getSnapshot();
    const freeformCellSize =
      viewport.width < GRID_CONFIG.mobileBreakpoint
        ? GRID_CONFIG.mobileCellSize
        : GRID_CONFIG.defaultCellSize;
    const freeformCols = Math.floor(viewport.width / freeformCellSize);
    const freeformRows = Math.floor(viewport.height / freeformCellSize);

    engine.setFreeformDimensions(freeformCols, freeformRows, freeformCellSize);

    const targetCellSize = snapshot.isFixedDimensions
      ? Math.min(
          GRID_CONFIG.defaultCellSize,
          Math.max(
            12,
            Math.floor(
              Math.min(viewport.width - 24, viewport.height - 24) /
                Math.max(snapshot.cols, snapshot.rows, 1),
            ),
          ),
        )
      : freeformCellSize;

    if (snapshot.isFixedDimensions) {
      engine.setDimensions(snapshot.cols, snapshot.rows, targetCellSize);
    } else {
      engine.setDimensions(freeformCols, freeformRows, targetCellSize);
    }
  }, [engine, viewport.width, viewport.height, isFixedDimensions]);

  useEffect(() => {
    return () => {
      if (!externalEngine) {
        engine.destroy();
      }
    };
  }, [engine, externalEngine]);

  return (
    <SimulationEngineContext.Provider value={engine}>
      {children}
    </SimulationEngineContext.Provider>
  );
}
