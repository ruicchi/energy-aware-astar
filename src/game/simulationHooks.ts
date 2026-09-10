import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import type { SimulationEngine, SimulationState } from "./simulationEngine";

export const SimulationEngineContext = createContext<SimulationEngine | null>(null);

/**
 * Hook to access the deep SimulationEngine instance directly.
 */
export function useSimulationEngine(): SimulationEngine {
  const engine = useContext(SimulationEngineContext);
  if (!engine) {
    throw new Error("useSimulationEngine must be used within a SimulationProvider");
  }
  return engine;
}

/**
 * Performs shallow equality check between two records or primitives.
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }
  const keysA = Object.keys(a) as (keyof T)[];
  const keysB = Object.keys(b) as (keyof T)[];
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Granular selector hook that subscribes to the deep SimulationEngine module.
 * Only triggers component re-renders when the selected slice actually changes
 * according to the provided equality function (default: shallowEqual).
 */
export function useSimulationSelector<T>(
  selector: (state: SimulationState) => T,
  isEqual: (a: T, b: T) => boolean = shallowEqual,
): T {
  const engine = useSimulationEngine();
  const cacheRef = useRef<{
    state: SimulationState | null;
    selected: T | null;
    hasSelected: boolean;
  }>({
    state: null,
    selected: null,
    hasSelected: false,
  });

  const getSelection = useCallback(() => {
    const currentState = engine.getSnapshot();
    if (cacheRef.current.state === currentState && cacheRef.current.hasSelected) {
      return cacheRef.current.selected as T;
    }
    const nextSelected = selector(currentState);
    if (
      cacheRef.current.hasSelected &&
      isEqual(cacheRef.current.selected as T, nextSelected)
    ) {
      cacheRef.current.state = currentState;
      return cacheRef.current.selected as T;
    }
    cacheRef.current.state = currentState;
    cacheRef.current.selected = nextSelected;
    cacheRef.current.hasSelected = true;
    return nextSelected;
  }, [engine, selector, isEqual]);

  return useSyncExternalStore(engine.subscribe, getSelection, getSelection);
}

/**
 * Sliced hook for grid viewport & dimension parameters.
 */
export function useGridDimensions() {
  return useSimulationSelector(
    (s) => ({
      cols: s.cols,
      rows: s.rows,
      cellSize: s.cellSize,
      isFixedDimensions: s.isFixedDimensions,
    }),
    shallowEqual,
  );
}

/**
 * Sliced hook for playback & kinematic traversal status.
 */
export function usePlaybackState() {
  return useSimulationSelector(
    (s) => ({
      playbackStatus: s.playbackStatus,
      isAnimating: s.isAnimating,
      isWalking: s.isWalking,
      hasFinishedWalking: s.hasFinishedWalking,
      isLocked: s.isLocked,
      walkFailure: s.walkFailure,
    }),
    shallowEqual,
  );
}

/**
 * Sliced hook for search policies, path visualization, and energy metrics.
 */
export function useSearchTelemetry() {
  return useSimulationSelector(
    (s) => ({
      selectedAlgo: s.selectedAlgo,
      isManhattanFinished: s.isManhattanFinished,
      isEnergyFinished: s.isEnergyFinished,
      showManhattanSearch: s.showManhattanSearch,
      showEnergySearch: s.showEnergySearch,
      isPathVisible: s.isPathVisible,
      pathTheme: s.pathTheme,
      currentPath: s.currentPath,
      hasPath: Boolean(s.currentPath && s.currentPath.length > 0),
      pathMetrics: s.pathMetrics,
    }),
    shallowEqual,
  );
}

/**
 * Sliced hook for active terrain tool & brush settings.
 */
export function useBrushState() {
  return useSimulationSelector(
    (s) => ({
      activeBrush: s.activeBrush,
      elevationBrushValue: s.elevationBrushValue,
      dirtBrushValue: s.dirtBrushValue,
      waterBrushValue: s.waterBrushValue,
      showGradients: s.showGradients,
      robotHeading: s.robotHeading,
      activeStrokeBrush: s.activeStrokeBrush,
    }),
    shallowEqual,
  );
}

/**
 * Sliced hook for scenario terrain maps and actor placements.
 */
export function useTerrainState() {
  return useSimulationSelector(
    (s) => ({
      wallNodes: s.wallNodes,
      wallNode: s.wallNodes,
      terrainFactors: s.terrainFactors,
      terrainTypes: s.terrainTypes,
      elevations: s.elevations,
      showGradients: s.showGradients,
      robotNode: s.robotNode,
      destinationNode: s.destinationNode,
    }),
    shallowEqual,
  );
}

/**
 * Sliced hook for scenario catalog & loading status.
 */
export function useScenarioState() {
  return useSimulationSelector(
    (s) => ({
      isFixedDimensions: s.isFixedDimensions,
      loadedScenarioName: s.loadedScenarioName,
      isLocked: s.isLocked,
    }),
    shallowEqual,
  );
}
