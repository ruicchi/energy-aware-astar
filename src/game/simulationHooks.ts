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
 * State required by simulation control panels.
 */
export interface ControlBarState {
  isFixedDimensions: boolean;
  isLocked: boolean;
  loadedScenarioName: string | null;
  activeBrush: BrushMode;
  dirtBrushValue: number;
  waterBrushValue: number;
  elevationBrushValue: number;
  maxTraversableSlope: number;
  showGradients: boolean;
  robotHeading: Heading;
  isEnergyAware: boolean;
  selectedAlgo: AlgorithmType;
  isManhattanFinished: boolean;
  isEnergyFinished: boolean;
  showManhattanSearch: boolean;
  showEnergySearch: boolean;
  hasPath: boolean;
  pathMetrics: SimulationState["pathMetrics"];
  isWalking: boolean;
  walkFailure: { row: number; col: number; reason: string } | null;
  playbackStatus: PlaybackStatus;
}

/**
 * Domain model returned by `useControlBar`, combining simulation controls state with bound commands.
 */
export interface ControlBarModel extends ControlBarState {
  loadPreset: (preset: ScenarioPresetId) => void;
  loadProcedural: (seed?: number) => void;
  resetToFreeform: () => void;
  setActiveBrush: (brush: BrushMode) => void;
  setDirtBrushValue: (val: number) => void;
  setWaterBrushValue: (val: number) => void;
  setElevationBrushValue: (val: number) => void;
  setMaxTraversableSlope: (val: number) => void;
  setShowGradients: (val: boolean) => void;
  setRobotHeading: (heading: Heading) => void;
  setSelectedAlgo: (algo: AlgorithmType, runImmediate?: boolean) => void;
  visualize: (algo?: AlgorithmType) => void;
  walk: () => void;
  reset: () => void;
  solveInstantly: (algo?: AlgorithmType) => void;
  runSearch: (algo?: AlgorithmType) => void;
  walkPath: () => void;
  resetPath: () => void;
  toggleManhattanSearch: () => void;
  toggleEnergySearch: () => void;
}

/**
 * Pure selector projecting SimulationState into ControlBarState.
 */
export function selectControlBar(s: SimulationState): ControlBarState {
  return {
    isFixedDimensions: s.isFixedDimensions,
    isLocked: s.isLocked,
    loadedScenarioName: s.loadedScenarioName,
    activeBrush: s.activeBrush,
    dirtBrushValue: s.dirtBrushValue,
    waterBrushValue: s.waterBrushValue,
    elevationBrushValue: s.elevationBrushValue,
    maxTraversableSlope: s.maxTraversableSlope,
    showGradients: s.showGradients,
    robotHeading: s.robotHeading,
    isEnergyAware: s.selectedAlgo === "energyAware",
    selectedAlgo: s.selectedAlgo,
    isManhattanFinished: s.isManhattanFinished,
    isEnergyFinished: s.isEnergyFinished,
    showManhattanSearch: s.showManhattanSearch,
    showEnergySearch: s.showEnergySearch,
    hasPath: Boolean(s.currentPath && s.currentPath.length > 0),
    pathMetrics: s.pathMetrics,
    isWalking: s.isWalking,
    walkFailure: s.walkFailure,
    playbackStatus: s.playbackStatus,
  };
}

/**
 * Unified domain hook for the simulation control ribbons and toolbars.
 */
export function useControlBar(): ControlBarModel {
  const engine = useSimulationEngine();
  const state = useSimulationSelector(selectControlBar, shallowEqual);

  const loadPreset = useCallback((preset: ScenarioPresetId) => engine.loadPreset(preset), [engine]);
  const loadProcedural = useCallback((seed?: number) => engine.loadProcedural(seed), [engine]);
  const resetToFreeform = useCallback(() => engine.resetToFreeform(), [engine]);
  const setActiveBrush = useCallback((brush: BrushMode) => engine.setActiveBrush(brush), [engine]);
  const setDirtBrushValue = useCallback((val: number) => engine.setDirtBrushValue(val), [engine]);
  const setWaterBrushValue = useCallback((val: number) => engine.setWaterBrushValue(val), [engine]);
  const setElevationBrushValue = useCallback((val: number) => engine.setElevationBrushValue(val), [engine]);
  const setMaxTraversableSlope = useCallback((val: number) => engine.setMaxTraversableSlope(val), [engine]);
  const setShowGradients = useCallback((val: boolean) => engine.setShowGradients(val), [engine]);
  const setRobotHeading = useCallback((heading: Heading) => engine.setRobotHeading(heading), [engine]);
  const setSelectedAlgo = useCallback((algo: AlgorithmType, runImmediate?: boolean) => engine.setSelectedAlgo(algo, runImmediate), [engine]);
  const visualize = useCallback((algo?: AlgorithmType) => engine.visualize(algo), [engine]);
  const walk = useCallback(() => engine.walk(), [engine]);
  const reset = useCallback(() => engine.reset(), [engine]);
  const solveInstantly = useCallback((algo?: AlgorithmType) => engine.solveInstantly(algo), [engine]);
  const toggleManhattanSearch = useCallback(() => engine.toggleManhattanSearch(), [engine]);
  const toggleEnergySearch = useCallback(() => engine.toggleEnergySearch(), [engine]);

  return useMemo(
    () => ({
      ...state,
      loadPreset,
      loadProcedural,
      resetToFreeform,
      setActiveBrush,
      setDirtBrushValue,
      setWaterBrushValue,
      setElevationBrushValue,
      setMaxTraversableSlope,
      setShowGradients,
      setRobotHeading,
      setSelectedAlgo,
      visualize,
      walk,
      reset,
      solveInstantly,
      runSearch: visualize,
      walkPath: walk,
      resetPath: reset,
      toggleManhattanSearch,
      toggleEnergySearch,
    }),
    [
      state,
      loadPreset,
      loadProcedural,
      resetToFreeform,
      setActiveBrush,
      setDirtBrushValue,
      setWaterBrushValue,
      setElevationBrushValue,
      setMaxTraversableSlope,
      setShowGradients,
      setRobotHeading,
      setSelectedAlgo,
      visualize,
      walk,
      reset,
      solveInstantly,
      toggleManhattanSearch,
      toggleEnergySearch,
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
  const engine = useSimulationEngine();
  const state = useSimulationSelector(
    (s) => ({
      robotHeading: s.robotHeading,
      isEnergyAware: s.selectedAlgo === "energyAware",
    }),
    shallowEqual,
  );

  const setRobotHeading = useCallback(
    (heading: Heading) => engine.setRobotHeading(heading),
    [engine],
  );

  return useMemo(
    () => ({
      ...state,
      setRobotHeading,
    }),
    [state, setRobotHeading],
  );
}

/**
 * Sliced hook for path calculation metrics.
 */
export function usePathMetrics(): SimulationState["pathMetrics"] {
  return useSimulationSelector((s) => s.pathMetrics);
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
      isPaused: s.isPaused,
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
      maxTraversableSlope: s.maxTraversableSlope,
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
