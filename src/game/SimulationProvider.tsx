import { useState, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useViewport } from "../hooks/useViewport";
import { SimulationEngine } from "./simulationEngine";
import { SimulationEngineContext } from "./simulationHooks";

export interface SimulationProviderProps {
  children: ReactNode;
  engine?: SimulationEngine;
}

export function SimulationProvider({ children, engine: externalEngine }: SimulationProviderProps) {
  const viewport = useViewport();
  const [internalEngine] = useState(() => {
    if (externalEngine) return externalEngine;
    return new SimulationEngine({
      cols: viewport.cols,
      rows: viewport.rows,
      cellSize: viewport.cellSize,
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
    engine.setFreeformDimensions(viewport.cols, viewport.rows, viewport.cellSize);

    const targetCellSize = snapshot.isFixedDimensions
      ? viewport.calculateFixedCellSize(snapshot.cols, snapshot.rows)
      : viewport.cellSize;

    if (snapshot.isFixedDimensions) {
      engine.setDimensions(snapshot.cols, snapshot.rows, targetCellSize);
    } else {
      engine.setDimensions(viewport.cols, viewport.rows, targetCellSize);
    }
  }, [engine, viewport, isFixedDimensions]);

  useEffect(() => {
    return () => {
      if (!externalEngine) {
        engine.destroy();
      }
    };
  }, [engine, externalEngine]);

  return (
    <SimulationEngineContext.Provider value={engine}>{children}</SimulationEngineContext.Provider>
  );
}
