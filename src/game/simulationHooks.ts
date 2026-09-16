import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type {
  Heading,
  BrushMode,
  AlgorithmType,
  EnergyBreakdown,
} from "../shared/types";
import type {
  SimulationEngine,
  SimulationState,
  PlaybackStatus,
} from "./simulationEngine";

export {
  SCENARIO_PRESETS,
  type ScenarioPresetId,
  type ScenarioPresetDescriptor,
} from "./simulationEngine";

export interface SimulationPathMetrics {
  algorithm: string;
  distance: number;
  energy: number;
  energyBreakdown: EnergyBreakdown;
  isSafe?: boolean;
  safetyFailureReason?: string;
}

export type SimulationMetrics = SimulationPathMetrics;

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
 * Computes the SVG polyline points string from a path coordinate sequence.
 */
export function computePolylinePoints(
  path: readonly string[] | string[] | null | undefined,
  cellSize: number,
): string {
  if (!path || path.length < 2) return "";
  return path
    .map((key) => {
      const [r, c] = key.split("-").map(Number);
      const x = c * cellSize + cellSize / 2;
      const y = r * cellSize + cellSize / 2;
      return `${x},${y}`;
    })
    .join(" ");
}

/**
 * State required by the interactive Grid Canvas view.
 */
export interface GridCanvasState {
  cols: number;
  rows: number;
  cellSize: number;
  isFixedDimensions: boolean;
  wallNodes: Set<string>;
  wallNode: Set<string>; // Alias for backward compatibility
  terrainFactors: Map<string, number>;
  terrainTypes: Map<string, "dirt" | "water">;
  elevations: Map<string, number>;
  showGradients: boolean;
  maxTraversableSlope?: number;
  robotNode: string;
  destinationNode: string;
  robotHeading: Heading;
  activeStrokeBrush: BrushMode | "robot" | "destination" | null;
  isWalking: boolean;
  isLocked: boolean;
  showManhattanSearch: boolean;
  showEnergySearch: boolean;
  isLineVisible: boolean;
  polylinePoints: string;
  currentPath: string[] | null;
}

/**
 * Domain model returned by `useGridCanvas`, packaging canvas state and pointer stroke actions.
 */
export interface GridCanvasModel extends GridCanvasState {
  handleMouseDown: (key: string) => void;
  handleMouseEnter: (key: string) => void;
  handleMouseUp: () => void;
}

/**
 * Pure selector projecting SimulationState into GridCanvasState.
 */
export function selectGridCanvas(s: SimulationState): GridCanvasState {
  const isLineVisible = Boolean(
    s.isPathVisible &&
      s.currentPath &&
      s.currentPath.length > 1 &&
      ((s.pathTheme === "manhattan" && s.showManhattanSearch) ||
        (s.pathTheme === "energy" && s.showEnergySearch)),
  );

  const polylinePoints = isLineVisible
    ? computePolylinePoints(s.currentPath, s.cellSize)
    : "";

  return {
    cols: s.cols,
    rows: s.rows,
    cellSize: s.cellSize,
    isFixedDimensions: s.isFixedDimensions,
    wallNodes: s.wallNodes,
    wallNode: s.wallNodes,
    terrainFactors: s.terrainFactors,
    terrainTypes: s.terrainTypes,
    elevations: s.elevations,
    showGradients: s.showGradients,
    maxTraversableSlope: s.showGradients ? s.maxTraversableSlope : undefined,
    robotNode: s.robotNode,
    destinationNode: s.destinationNode,
    robotHeading: s.robotHeading,
    activeStrokeBrush: s.activeStrokeBrush,
    isWalking: s.isWalking,
    isLocked: s.isLocked,
    showManhattanSearch: s.showManhattanSearch,
    showEnergySearch: s.showEnergySearch,
    isLineVisible,
    polylinePoints,
    currentPath: s.currentPath,
  };
}

/**
 * Unified domain hook for the Grid Canvas viewport.
 * Consolidates grid dimensions, terrain collections, actor positions,
 * search polyline rendering, and stroke pointer handlers into one cohesive seam.
 */
export function useGridCanvas(): GridCanvasModel {
  const engine = useSimulationEngine();
  const canvasState = useSimulationSelector(selectGridCanvas, shallowEqual);

  const handleMouseDown = useCallback((key: string) => engine.startPaint(key), [engine]);
  const handleMouseEnter = useCallback((key: string) => engine.continuePaint(key), [engine]);
  const handleMouseUp = useCallback(() => engine.endPaint(), [engine]);

  return useMemo(
    () => ({
      ...canvasState,
      handleMouseDown,
      handleMouseEnter,
      handleMouseUp,
    }),
    [canvasState, handleMouseDown, handleMouseEnter, handleMouseUp],
  );
}

/**
 * State required by simulation navigation, algorithm execution, and scenario control panels.
 */
export interface SimulationControlsState {
  loadedScenarioName: string | null;
  isFixedDimensions: boolean;
  isLocked: boolean;
  selectedAlgo: AlgorithmType;
  isEnergyAware: boolean;
  use3DStandard: boolean;
  robotHeading: Heading;
  isManhattanFinished: boolean;
  isEnergyFinished: boolean;
  showManhattanSearch: boolean;
  showEnergySearch: boolean;
  hasPath: boolean;
  pathMetrics: SimulationState["pathMetrics"];
  playbackStatus: PlaybackStatus;
  isWalking: boolean;
  walkFailure: { row: number; col: number; reason: string } | null;
}

/**
 * Domain model returned by `useSimulationControls`, pairing control state with bound commands.
 */
export interface SimulationControlsModel extends SimulationControlsState {
  loadPreset: (preset: ScenarioPresetId) => void;
  loadProcedural: (seed?: number) => void;
  resetToFreeform: () => void;
  setSelectedAlgo: (algo: AlgorithmType, runImmediate?: boolean) => void;
  setRobotHeading: (heading: Heading) => void;
  setUse3DStandard: (enabled: boolean) => void;
  toggleUse3DStandard: () => void;
  visualize: (algo?: AlgorithmType) => void;
  solveInstantly: (algo?: AlgorithmType) => void;
  walk: () => void;
  reset: () => void;
  toggleManhattanSearch: () => void;
  toggleEnergySearch: () => void;
}

/**
 * Pure selector projecting SimulationState into SimulationControlsState.
 */
export function selectSimulationControls(s: SimulationState): SimulationControlsState {
  return {
    loadedScenarioName: s.loadedScenarioName,
    isFixedDimensions: s.isFixedDimensions,
    isLocked: s.isLocked,
    selectedAlgo: s.selectedAlgo,
    isEnergyAware: s.selectedAlgo === "energyAware",
    use3DStandard: s.use3DStandard,
    robotHeading: s.robotHeading,
    isManhattanFinished: s.isManhattanFinished,
    isEnergyFinished: s.isEnergyFinished,
    showManhattanSearch: s.showManhattanSearch,
    showEnergySearch: s.showEnergySearch,
    hasPath: Boolean(s.currentPath && s.currentPath.length > 0),
    pathMetrics: s.pathMetrics,
    playbackStatus: s.playbackStatus,
    isWalking: s.isWalking,
    walkFailure: s.walkFailure,
  };
}

/**
 * Unified domain seam for scenario loading, algorithm selection, vehicle posture, and simulation playback controls.
 */
export function useSimulationControls(): SimulationControlsModel {
  const engine = useSimulationEngine();
  const state = useSimulationSelector(selectSimulationControls, shallowEqual);

  const loadPreset = useCallback((preset: ScenarioPresetId) => engine.loadPreset(preset), [engine]);
  const loadProcedural = useCallback((seed?: number) => engine.loadProcedural(seed), [engine]);
  const resetToFreeform = useCallback(() => engine.resetToFreeform(), [engine]);
  const setSelectedAlgo = useCallback(
    (algo: AlgorithmType, runImmediate?: boolean) => engine.setSelectedAlgo(algo, runImmediate),
    [engine],
  );
  const setRobotHeading = useCallback(
    (heading: Heading) => engine.setRobotHeading(heading),
    [engine],
  );
  const setUse3DStandard = useCallback(
    (enabled: boolean) => engine.setUse3DStandard(enabled),
    [engine],
  );
  const toggleUse3DStandard = useCallback(
    () => engine.toggleUse3DStandard(),
    [engine],
  );
  const visualize = useCallback((algo?: AlgorithmType) => engine.visualize(algo), [engine]);
  const solveInstantly = useCallback((algo?: AlgorithmType) => engine.solveInstantly(algo), [engine]);
  const walk = useCallback(() => engine.walk(), [engine]);
  const reset = useCallback(() => engine.reset(), [engine]);
  const toggleManhattanSearch = useCallback(() => engine.toggleManhattanSearch(), [engine]);
  const toggleEnergySearch = useCallback(() => engine.toggleEnergySearch(), [engine]);

  return useMemo(
    () => ({
      ...state,
      loadPreset,
      loadProcedural,
      resetToFreeform,
      setSelectedAlgo,
      setRobotHeading,
      setUse3DStandard,
      toggleUse3DStandard,
      visualize,
      solveInstantly,
      walk,
      reset,
      toggleManhattanSearch,
      toggleEnergySearch,
    }),
    [
      state,
      loadPreset,
      loadProcedural,
      resetToFreeform,
      setSelectedAlgo,
      setRobotHeading,
      setUse3DStandard,
      toggleUse3DStandard,
      visualize,
      solveInstantly,
      walk,
      reset,
      toggleManhattanSearch,
      toggleEnergySearch,
    ],
  );
}

/**
 * State required by interactive terrain tool ribbons and brush sliders.
 */
export interface BrushControlsState {
  activeBrush: BrushMode;
  dirtBrushValue: number;
  waterBrushValue: number;
  elevationBrushValue: number;
  maxTraversableSlope: number;
  showGradients: boolean;
}

/**
 * Domain model returned by `useBrushControls`, combining brush parameters with bound actions.
 */
export interface BrushControlsModel extends BrushControlsState {
  setActiveBrush: (brush: BrushMode) => void;
  setDirtBrushValue: (val: number) => void;
  setWaterBrushValue: (val: number) => void;
  setElevationBrushValue: (val: number) => void;
  setMaxTraversableSlope: (val: number) => void;
  setShowGradients: (val: boolean) => void;
  toggleGradients: () => void;
  clearWalls: () => void;
  reset: () => void;
}

/**
 * Pure selector projecting SimulationState into BrushControlsState.
 */
export function selectBrushControls(s: SimulationState): BrushControlsState {
  return {
    activeBrush: s.activeBrush,
    dirtBrushValue: s.dirtBrushValue,
    waterBrushValue: s.waterBrushValue,
    elevationBrushValue: s.elevationBrushValue,
    maxTraversableSlope: s.maxTraversableSlope,
    showGradients: s.showGradients,
  };
}

/**
 * Unified domain seam for active terrain brushes, friction costs, and slope controls.
 */
export function useBrushControls(): BrushControlsModel {
  const engine = useSimulationEngine();
  const state = useSimulationSelector(selectBrushControls, shallowEqual);

  const setActiveBrush = useCallback((brush: BrushMode) => engine.setActiveBrush(brush), [engine]);
  const setDirtBrushValue = useCallback((val: number) => engine.setDirtBrushValue(val), [engine]);
  const setWaterBrushValue = useCallback((val: number) => engine.setWaterBrushValue(val), [engine]);
  const setElevationBrushValue = useCallback((val: number) => engine.setElevationBrushValue(val), [engine]);
  const setMaxTraversableSlope = useCallback((val: number) => engine.setMaxTraversableSlope(val), [engine]);
  const setShowGradients = useCallback((val: boolean) => engine.setShowGradients(val), [engine]);
  const toggleGradients = useCallback(() => engine.toggleGradients(), [engine]);
  const clearWalls = useCallback(() => engine.clearWalls(), [engine]);
  const reset = useCallback(() => engine.reset(), [engine]);

  return useMemo(
    () => ({
      ...state,
      setActiveBrush,
      setDirtBrushValue,
      setWaterBrushValue,
      setElevationBrushValue,
      setMaxTraversableSlope,
      setShowGradients,
      toggleGradients,
      clearWalls,
      reset,
    }),
    [
      state,
      setActiveBrush,
      setDirtBrushValue,
      setWaterBrushValue,
      setElevationBrushValue,
      setMaxTraversableSlope,
      setShowGradients,
      toggleGradients,
      clearWalls,
      reset,
    ],
  );
}

/**
 * Domain model for robot heading controls.
 */
export interface HeadingControlsModel {
  robotHeading: Heading;
  isEnergyAware: boolean;
  setRobotHeading: (heading: Heading) => void;
}

/**
 * Caller-aligned hook for Robot Heading orientation controls.
 */
export function useHeadingControls(): HeadingControlsModel {
  const { robotHeading, isEnergyAware, setRobotHeading } = useSimulationControls();
  return useMemo(
    () => ({
      robotHeading,
      isEnergyAware,
      setRobotHeading,
    }),
    [robotHeading, isEnergyAware, setRobotHeading],
  );
}

/**
 * Sliced hook for path calculation metrics.
 */
export function usePathMetrics(): SimulationState["pathMetrics"] {
  return useSimulationSelector((s) => s.pathMetrics);
}
