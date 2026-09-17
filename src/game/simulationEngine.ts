import type {
  Scenario,
  Heading,
  BrushMode,
  AlgorithmType,
  EnergyBreakdown,
} from "../shared/types";
import {
  VEHICLE_CONFIG,
  ANIMATION_CONFIG,
  GRID_CONFIG,
  BRUSH_CONFIG,
} from "../config/simulationConfig";
import {
  evaluatePathSafety,
} from "../physics/terrainPhysics";
import { findPath } from "../algorithms/astar";
import {
  getScenarioPreset,
  generateProceduralScenario,
  SCENARIO_PRESETS,
  type ScenarioPresetId,
  type ScenarioPresetDescriptor,
} from "../data";
import {
  ScenarioTerrain,
  type PaintContext,
  type CellMutation,
} from "./scenarioTerrain";
import { resolveMutationPreview } from "./cellDisplay";
import {
  SimulationPlayback,
  compileSearchTimeline,
  compileWalkTimeline,
  type TimelineFrame,
  type PlaybackStatus,
} from "./simulationPlayback";
import {
  type SimulationVisualizer,
  DomVisualizer,
  NullVisualizer,
  MemoryVisualizer,
  createDefaultVisualizer,
  type SimulationDomAdapter,
  type SimulationDomElement,
  createDefaultDomAdapter,
} from "./simulationVisualizer";

export {
  SCENARIO_PRESETS,
  type ScenarioPresetId,
  type ScenarioPresetDescriptor,
  ScenarioTerrain,
  type CellMutation,
  SimulationPlayback,
  compileSearchTimeline,
  compileWalkTimeline,
  type TimelineFrame,
  type PlaybackStatus,
  type SimulationVisualizer,
  DomVisualizer,
  NullVisualizer,
  MemoryVisualizer,
  createDefaultVisualizer,
  type SimulationDomAdapter,
  type SimulationDomElement,
  createDefaultDomAdapter,
};

export interface SimulationState {
  // Dimensions
  cols: number;
  rows: number;
  cellSize: number;
  isFixedDimensions: boolean;
  loadedScenarioName: string | null;

  // Grid / Scenario Terrain State
  wallNodes: Set<string>;
  terrainFactors: Map<string, number>;
  terrainTypes: Map<string, "dirt" | "water">;
  elevations: Map<string, number>;
  robotNode: string;
  destinationNode: string;

  // Tool / Brush Configurations
  activeBrush: BrushMode;
  elevationBrushValue: number;
  dirtBrushValue: number;
  waterBrushValue: number;
  maxTraversableSlope: number;
  showGradients: boolean;
  robotHeading: Heading;
  selectedAlgo: AlgorithmType;
  use3DStandard: boolean;

  // Playback & Animation State
  playbackStatus: "idle" | "searching" | "walking";
  isAnimating: boolean;
  isWalking: boolean;
  hasFinishedWalking: boolean;
  isLocked: boolean;
  isPaused: boolean;

  // Search & Path Telemetry State
  isManhattanFinished: boolean;
  isEnergyFinished: boolean;
  showManhattanSearch: boolean;
  showEnergySearch: boolean;
  isPathVisible: boolean;
  pathTheme: "manhattan" | "energy" | null;
  currentPath: string[] | null;
  walkingStep: number;
  walkFailure: { row: number; col: number; reason: string } | null;
  pathMetrics: {
    algorithm: string;
    distance: number;
    energy: number;
    energyBreakdown: EnergyBreakdown;
    isSafe?: boolean;
    safetyFailureReason?: string;
  } | null;
  activeStrokeBrush: BrushMode | "robot" | "destination" | null;
}

export interface SimulationEngineOptions {
  cols?: number;
  rows?: number;
  cellSize?: number;
  initialRobotNode?: string;
  initialDestinationNode?: string;
  initialWallNodes?: Set<string>;
  initialTerrainFactors?: Map<string, number>;
  initialTerrainTypes?: Map<string, "dirt" | "water">;
  initialElevations?: Map<string, number>;
  initialHeading?: Heading;
  initialAlgo?: AlgorithmType;
  initialUse3DStandard?: boolean;
  initialMaxTraversableSlope?: number;
  visualizer?: SimulationVisualizer;
  /** Backwards compatibility alias for visualizer */
  domAdapter?: SimulationVisualizer;
}


/**
 * The deep SimulationEngine module.
 * Encapsulates:
 * - Scenario terrain state (walls, friction, elevation, robot/dest nodes)
 * - Transient pointer drawing strokes & atomic commit semantics
 * - Pathfinding execution, telemetry calculation, and staggered animation sequencing
 * - Kinematic robot walking playback with slope safety / tip-over detection
 * - Direct DOM visual styling adapters & headless lifecycle timers
 */
export class SimulationEngine {
  private cols: number;
  private rows: number;
  private cellSize: number;
  private isFixedDimensions: boolean = false;
  private loadedScenarioName: string | null = null;
  private defaultMaxTraversableSlope: number;
  private maxTraversableSlope: number;
  private initialScenarioHeading: Heading = VEHICLE_CONFIG.defaultHeading;
  private initialHeading: Heading = VEHICLE_CONFIG.defaultHeading;
  private freeformCols: number;
  private freeformRows: number;
  private freeformCellSize: number;
  private initialRobotNode: string | null = null;
  private initialDestinationNode: string | null = null;

  private terrain: ScenarioTerrain;

  private activeBrush: BrushMode = "wall";
  private elevationBrushValue: number = BRUSH_CONFIG.elevation.defaultValue;
  private dirtBrushValue: number = BRUSH_CONFIG.dirt.defaultValue;
  private waterBrushValue: number = BRUSH_CONFIG.water.defaultValue;
  private showGradients: boolean = false;
  private robotHeading: Heading = VEHICLE_CONFIG.defaultHeading;
  private selectedAlgo: AlgorithmType = "energyAware";
  private use3DStandard: boolean = false;

  private playbackStatus: "idle" | "searching" | "walking" = "idle";
  private isAnimating: boolean = false;
  private isWalking: boolean = false;
  private hasFinishedWalking: boolean = false;

  private isManhattanFinished: boolean = false;
  private isEnergyFinished: boolean = false;
  private showManhattanSearch: boolean = true;
  private showEnergySearch: boolean = true;
  private isPathVisible: boolean = false;
  private pathTheme: "manhattan" | "energy" | null = null;
  private currentPath: string[] | null = null;
  private walkingStep: number = -1;
  private walkFailure: { row: number; col: number; reason: string } | null = null;
  private pathMetrics: {
    algorithm: string;
    distance: number;
    energy: number;
    energyBreakdown: EnergyBreakdown;
    isSafe?: boolean;
    safetyFailureReason?: string;
  } | null = null;
  private visualizer: SimulationVisualizer;
  private listeners: Set<() => void> = new Set();
  private playback: SimulationPlayback = new SimulationPlayback();
  private cachedSnapshot: SimulationState | null = null;

  constructor(options: SimulationEngineOptions = {}) {
    this.cols = options.cols ?? GRID_CONFIG.defaultCols;
    this.rows = options.rows ?? GRID_CONFIG.defaultRows;
    this.cellSize = options.cellSize ?? GRID_CONFIG.defaultCellSize;

    this.freeformCols = this.cols;
    this.freeformRows = this.rows;
    this.freeformCellSize = this.cellSize;

    this.initialRobotNode = options.initialRobotNode ?? null;
    this.initialDestinationNode = options.initialDestinationNode ?? null;
    this.initialHeading = options.initialHeading ?? VEHICLE_CONFIG.defaultHeading;

    this.visualizer = options.visualizer ?? options.domAdapter ?? createDefaultVisualizer();
    this.terrain = new ScenarioTerrain({
      cols: this.cols,
      rows: this.rows,
      initialRobotNode: options.initialRobotNode,
      initialDestinationNode: options.initialDestinationNode,
      initialWallNodes: options.initialWallNodes,
      initialTerrainFactors: options.initialTerrainFactors,
      initialTerrainTypes: options.initialTerrainTypes,
      initialElevations: options.initialElevations,
    });
    this.defaultMaxTraversableSlope =
      options.initialMaxTraversableSlope ?? VEHICLE_CONFIG.maxTraversableSlope;
    this.maxTraversableSlope = this.defaultMaxTraversableSlope;
    this.robotHeading = this.initialHeading;
    this.selectedAlgo = options.initialAlgo ?? "energyAware";
    this.use3DStandard = options.initialUse3DStandard ?? false;

    this.subscribe = this.subscribe.bind(this);
    this.getSnapshot = this.getSnapshot.bind(this);
  }

  // --- External Store Subscription Interface ---

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): SimulationState {
    if (this.cachedSnapshot) return this.cachedSnapshot;

    const terrainSnapshot = this.terrain.getSnapshot();

    this.cachedSnapshot = {
      cols: this.cols,
      rows: this.rows,
      cellSize: this.cellSize,
      isFixedDimensions: this.isFixedDimensions,
      loadedScenarioName: this.loadedScenarioName,
      wallNodes: terrainSnapshot.wallNodes,
      terrainFactors: terrainSnapshot.terrainFactors,
      terrainTypes: terrainSnapshot.terrainTypes,
      elevations: terrainSnapshot.elevations,
      robotNode: terrainSnapshot.robotNode,
      destinationNode: terrainSnapshot.destinationNode,
      activeBrush: this.activeBrush,
      elevationBrushValue: this.elevationBrushValue,
      dirtBrushValue: this.dirtBrushValue,
      waterBrushValue: this.waterBrushValue,
      maxTraversableSlope: this.maxTraversableSlope,
      showGradients: this.showGradients,
      robotHeading: this.robotHeading,
      selectedAlgo: this.selectedAlgo,
      use3DStandard: this.use3DStandard,
      playbackStatus: this.playbackStatus,
      isAnimating: this.isAnimating,
      isWalking: this.isWalking,
      hasFinishedWalking: this.hasFinishedWalking,
      isLocked: this.isAnimating || this.isWalking,
      isPaused: this.playback.isPaused(),
      isManhattanFinished: this.isManhattanFinished,
      isEnergyFinished: this.isEnergyFinished,
      showManhattanSearch: this.showManhattanSearch,
      showEnergySearch: this.showEnergySearch,
      isPathVisible: this.isPathVisible,
      pathTheme: this.pathTheme,
      currentPath: this.currentPath,
      walkingStep: this.walkingStep,
      walkFailure: this.walkFailure,
      pathMetrics: this.pathMetrics,
      activeStrokeBrush: this.terrain.getActiveStrokeBrush(),
    };

    return this.cachedSnapshot;
  };

  private notify(): void {
    this.cachedSnapshot = null;
    for (const listener of this.listeners) {
      listener();
    }
  }

  // --- Dimension & Viewport Management ---

  public setFreeformDimensions(cols: number, rows: number, cellSize: number): void {
    this.freeformCols = cols;
    this.freeformRows = rows;
    this.freeformCellSize = cellSize;
  }

  private resetActorsVisuals(): void {
    const [startR, startC] = this.terrain.getRobotNode().split("-").map(Number);
    this.visualizer.resetRobot(startC, startR, this.robotHeading, this.cellSize);
    const [destR, destC] = this.terrain.getDestinationNode().split("-").map(Number);
    this.visualizer.setDestinationPosition(destC, destR, this.cellSize);
  }

  public setDimensions(cols: number, rows: number, cellSize: number): void {
    if (this.isFixedDimensions) {
      if (this.cellSize !== cellSize) {
        this.cellSize = cellSize;
        this.resetActorsVisuals();
        this.notify();
      }
      return;
    }

    this.freeformCols = cols;
    this.freeformRows = rows;
    this.freeformCellSize = cellSize;

    if (cols === this.cols && rows === this.rows && cellSize === this.cellSize) return;
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;

    const { clampedRobotR, clampedRobotC, clampedDestR, clampedDestC } = this.terrain.setDimensions(cols, rows);
    this.visualizer.resetRobot(clampedRobotC, clampedRobotR, this.robotHeading, this.cellSize);
    this.visualizer.setDestinationPosition(clampedDestC, clampedDestR, this.cellSize);
    this.notify();
  }

  // --- Scenario Query ---

  public getScenario(): Scenario {
    return this.terrain.toScenario({
      rows: this.rows,
      cols: this.cols,
      maxTraversableSlope: this.maxTraversableSlope,
      initialHeading: this.robotHeading,
      showGradients: this.showGradients,
    });
  }


  // --- Configuration Mutators ---

  public setActiveBrush(brush: BrushMode): void {
    if (this.activeBrush === brush) return;
    this.activeBrush = brush;
    this.notify();
  }

  public setElevationBrushValue(val: number): void {
    if (this.elevationBrushValue === val) return;
    this.elevationBrushValue = val;
    this.notify();
  }

  public setDirtBrushValue(val: number): void {
    if (this.dirtBrushValue === val) return;
    this.dirtBrushValue = val;
    this.terrain.updateTypeCost("dirt", val);
    this.notify();
  }

  public setWaterBrushValue(val: number): void {
    if (this.waterBrushValue === val) return;
    this.waterBrushValue = val;
    this.terrain.updateTypeCost("water", val);
    this.notify();
  }

  public setShowGradients(show: boolean): void {
    if (this.showGradients === show) return;
    this.showGradients = show;
    this.notify();
  }

  public toggleGradients(): void {
    this.showGradients = !this.showGradients;
    this.notify();
  }

  public setRobotHeading(heading: Heading): void {
    if (this.robotHeading === heading) return;
    this.robotHeading = heading;
    this.visualizer.setRobotHeading(heading, false);
    this.notify();
  }

  public setMaxTraversableSlope(slope: number | null): void {
    const nextSlope = slope ?? this.defaultMaxTraversableSlope;
    if (this.maxTraversableSlope === nextSlope) return;
    this.maxTraversableSlope = nextSlope;
    if (slope !== null && !this.isFixedDimensions) {
      this.defaultMaxTraversableSlope = nextSlope;
    }
    if (this.isPathVisible && !this.isAnimating && !this.isWalking) {
      this.solveInstantly(this.selectedAlgo);
    } else {
      this.notify();
    }
  }

  public getDefaultMaxTraversableSlope(): number {
    return this.defaultMaxTraversableSlope;
  }

  public setDefaultMaxTraversableSlope(slope: number): void {
    this.defaultMaxTraversableSlope = slope;
    if (!this.isFixedDimensions) {
      this.setMaxTraversableSlope(slope);
    }
  }

  public setSelectedAlgo(algo: AlgorithmType, instantSolveIfPathVisible = true): void {
    if (this.selectedAlgo === algo) return;
    this.selectedAlgo = algo;
    if (algo !== "energyAware") {
      this.robotHeading = "NONE";
      this.visualizer.setRobotHeading("NONE", false);
    } else if (this.loadedScenarioName && this.initialScenarioHeading !== "NONE") {
      this.robotHeading = this.initialScenarioHeading;
      this.visualizer.setRobotHeading(this.robotHeading, false);
    }

    if (
      this.isFixedDimensions &&
      instantSolveIfPathVisible &&
      (this.isPathVisible || Boolean(this.currentPath && this.currentPath.length > 0)) &&
      !this.isAnimating &&
      !this.isWalking
    ) {
      this.solveInstantly(algo);
    } else {
      if (
        !this.isFixedDimensions &&
        (this.isPathVisible ||
          Boolean(this.currentPath && this.currentPath.length > 0) ||
          this.isManhattanFinished ||
          this.isEnergyFinished)
      ) {
        this.clearAnimations();
      } else {
        this.notify();
      }
    }
  }

  public setUse3DStandard(enabled: boolean): void {
    if (this.use3DStandard === enabled) return;
    this.use3DStandard = enabled;
    this.cachedSnapshot = null;
    if (
      this.selectedAlgo !== "energyAware" &&
      (this.isPathVisible || Boolean(this.currentPath && this.currentPath.length > 0)) &&
      !this.isAnimating &&
      !this.isWalking
    ) {
      this.solveInstantly(this.selectedAlgo);
    } else {
      this.notify();
    }
  }

  public toggleUse3DStandard(): void {
    this.setUse3DStandard(!this.use3DStandard);
  }

  public toggleManhattanSearch(): void {
    this.showManhattanSearch = !this.showManhattanSearch;
    this.notify();
  }

  public toggleEnergySearch(): void {
    this.showEnergySearch = !this.showEnergySearch;
    this.notify();
  }

  // --- Transient Pointer & Stroke Buffering (delegated to ScenarioTerrain) ---

  public isSessionActive(): boolean {
    return this.terrain.isSessionActive();
  }

  private getPaintContext(): PaintContext {
    return {
      activeBrush: this.activeBrush,
      elevationBrushValue: this.elevationBrushValue,
      dirtBrushValue: this.dirtBrushValue,
      waterBrushValue: this.waterBrushValue,
      robotHeading: this.robotHeading,
      cellSize: this.cellSize,
    };
  }

  public isPainting(): boolean {
    return this.terrain.isSessionActive();
  }

  public startPaint(key: string): void {
    if (this.isAnimating || this.isWalking) return;

    if (this.currentPath || this.isManhattanFinished || this.isEnergyFinished) {
      this.clearAnimations();
    }

    const context = this.getPaintContext();
    const result = this.terrain.startStroke(key, context);
    if (result.modified) {
      if (result.brush === "robot") {
        const [r, c] = key.split("-").map(Number);
        this.visualizer.resetRobot(c, r, this.robotHeading, this.cellSize);
        this.visualizer.setDraggingActor?.("robot");
      } else if (result.brush === "destination") {
        const [r, c] = key.split("-").map(Number);
        this.visualizer.setDestinationPosition(c, r, this.cellSize);
        this.visualizer.setDraggingActor?.("destination");
      } else if (result.mutation && result.cellKey) {
        const preview = resolveMutationPreview(result.mutation);
        this.visualizer.previewCell(result.cellKey, preview.color, preview.isWall);
      }
    }
  }

  public continuePaint(key: string): void {
    if (!this.terrain.isSessionActive()) return;

    const result = this.terrain.continueStroke(key);
    if (result.modified) {
      if (result.brush === "robot") {
        const [r, c] = key.split("-").map(Number);
        this.visualizer.resetRobot(c, r, this.robotHeading, this.cellSize);
      } else if (result.brush === "destination") {
        const [r, c] = key.split("-").map(Number);
        this.visualizer.setDestinationPosition(c, r, this.cellSize);
      } else if (result.mutation && result.cellKey) {
        const preview = resolveMutationPreview(result.mutation);
        this.visualizer.previewCell(result.cellKey, preview.color, preview.isWall);
      }
    }
  }

  public endPaint(): void {
    const activeBrush = this.terrain.getActiveStrokeBrush();
    const wasActorMove = activeBrush === "robot" || activeBrush === "destination";
    this.visualizer.setDraggingActor?.(null);

    const modifiedCells = this.terrain.commitStroke();
    if (modifiedCells && modifiedCells.length > 0) {
      for (const key of modifiedCells) {
        this.visualizer.clearCellPreview(key);
      }
      if (this.isPathVisible) {
        this.solveInstantly(this.selectedAlgo);
      } else {
        this.notify();
      }
    } else if (wasActorMove) {
      if (this.isPathVisible) {
        this.solveInstantly(this.selectedAlgo);
      } else {
        this.notify();
      }
    }
  }

  public abortPaint(): void {
    const activeBrush = this.terrain.getActiveStrokeBrush();
    const wasActorMove = activeBrush === "robot" || activeBrush === "destination";
    this.visualizer.setDraggingActor?.(null);

    const rolledBack = this.terrain.abortStroke();
    if (rolledBack && rolledBack.length > 0) {
      for (const key of rolledBack) {
        this.visualizer.clearCellPreview(key, this.terrain.hasWall(key));
      }
      if (this.isPathVisible) {
        this.solveInstantly(this.selectedAlgo);
      } else {
        this.notify();
      }
    } else if (wasActorMove) {
      this.resetActorsVisuals();
      if (this.isPathVisible) {
        this.solveInstantly(this.selectedAlgo);
      } else {
        this.notify();
      }
    }
  }

  public clearWalls(): void {
    const keysToClean = this.terrain.clearAll();
    this.visualizer.clearAllCellPreviews(keysToClean);
    this.notify();
  }


  // --- Animation & Simulation Playback Management ---

  private clearTimers(): void {
    this.playback.stop();
  }

  public getPlayback(): SimulationPlayback {
    return this.playback;
  }

  public getVisualizer(): SimulationVisualizer {
    return this.visualizer;
  }

  public pausePlayback(): void {
    if (this.playback.isPlaying()) {
      this.playback.pause();
      this.notify();
    }
  }

  public resumePlayback(): void {
    if (this.playback.isPaused()) {
      this.playback.resume();
      this.notify();
    }
  }

  public stepPlayback(): boolean {
    const stepped = this.playback.step();
    if (stepped) {
      this.notify();
    }
    return stepped;
  }

  public flushPlayback(): void {
    if (this.playback.isPlaying() || this.playback.isPaused()) {
      this.playback.flush();
    }
  }

  public clearAnimations(): void {
    this.clearTimers();
    this.visualizer.clearSearchVisuals();

    this.isManhattanFinished = false;
    this.isEnergyFinished = false;
    this.isAnimating = false;
    this.showManhattanSearch = true;
    this.showEnergySearch = true;
    this.isPathVisible = false;
    this.pathTheme = null;
    this.playbackStatus = "idle";

    this.currentPath = null;
    this.walkingStep = -1;
    this.isWalking = false;
    this.hasFinishedWalking = false;
    this.walkFailure = null;
    this.pathMetrics = null;

    this.resetActorsVisuals();

    this.notify();
  }

  // --- Pathfinding Visualization ---

  public visualize(algoToRun?: AlgorithmType): void {
    const algo = algoToRun ?? this.selectedAlgo;

    this.clearTimers();
    this.visualizer.clearSearchVisuals();

    this.isManhattanFinished = false;
    this.isEnergyFinished = false;
    this.isWalking = false;
    this.hasFinishedWalking = false;
    this.walkFailure = null;
    this.walkingStep = -1;

    this.resetActorsVisuals();

    const scenario = this.getScenario();

    const algoConfigs: Record<AlgorithmType, { name: string; theme: "manhattan" | "energy" }> = {
      energyAware: { name: "Energy-Aware", theme: "energy" },
      manhattan: { name: "Manhattan", theme: "manhattan" },
      euclidean: { name: "Euclidean", theme: "energy" },
      octile: { name: "Octile", theme: "energy" },
      chebyshev: { name: "Chebyshev", theme: "energy" },
    };

    const config = algoConfigs[algo];
    const theme = config.theme;
    const result = findPath(scenario, { algorithm: algo, use3DStandard: this.use3DStandard });

    const { visitedNodesInOrder, shortestPath, totalEnergy, totalDistance, energyBreakdown } =
      result;

    const safety = evaluatePathSafety(shortestPath, scenario);
    const algoName =
      algo === "energyAware"
        ? config.name
        : this.use3DStandard
          ? `${config.name} (3D)`
          : config.name;

    this.pathMetrics = {
      algorithm: algoName,
      distance: totalDistance,
      energy: totalEnergy,
      energyBreakdown,
      isSafe: safety.isSafe,
      safetyFailureReason: safety.failureReason,
    };

    this.currentPath = shortestPath.length > 0 ? shortestPath : null;
    this.isAnimating = true;
    this.isPathVisible = false;
    this.pathTheme = theme;
    this.playbackStatus = "searching";
    this.notify();

    const searchAttr = theme === "manhattan" ? "manhattan" : "energy";

    const frames = compileSearchTimeline({
      visitedNodes: visitedNodesInOrder,
      delayMs: ANIMATION_CONFIG.searchStepDelayMs,
      onVisit: (node) => {
        this.visualizer.renderSearchNode(node.key, node.type, searchAttr);
      },
    });

    this.playback.play(frames, () => {
      if (shortestPath.length > 0) {
        this.isPathVisible = true;
      }
      this.isAnimating = false;
      this.playbackStatus = "idle";
      if (theme === "manhattan") {
        this.isManhattanFinished = true;
      } else {
        this.isEnergyFinished = true;
      }
      this.notify();
    });
  }

  // --- Kinematic Path Traversal (Robot Walk) ---

  public walk(): void {
    if (!this.currentPath || this.currentPath.length === 0 || this.isWalking) return;

    if (this.currentPath.length <= 1) {
      this.isWalking = false;
      this.hasFinishedWalking = true;
      this.playbackStatus = "idle";
      this.walkingStep = 0;
      this.notify();
      return;
    }

    this.clearTimers();
    this.isWalking = true;
    this.hasFinishedWalking = false;
    this.walkFailure = null;
    this.walkingStep = 0;
    this.playbackStatus = "walking";

    const [startR, startC] = this.currentPath[0].split("-").map(Number);
    this.visualizer.resetRobot(startC, startR, this.robotHeading, this.cellSize);

    this.notify();

    const scenario = this.getScenario();

    const frames = compileWalkTimeline({
      path: this.currentPath,
      initialHeading: this.robotHeading,
      scenario,
      stepDelayMs: ANIMATION_CONFIG.walkStepDelayMs,
      rotateDelayMs: ANIMATION_CONFIG.walkRotateDelayMs,
      onRotate: (heading) => {
        this.robotHeading = heading;
        this.visualizer.setRobotHeading(heading, true);
      },
      onStep: (col, row, stepIndex) => {
        this.walkingStep = stepIndex;
        this.visualizer.setRobotPosition(col, row, this.cellSize, true);
      },
      onFailure: (failure) => {
        this.walkFailure = failure;
      },
    });

    // If walk completed safely, append settle frame matching robot kinematic slide duration
    if (frames.length > 0 && !frames[frames.length - 1].tag?.startsWith("walk-fail")) {
      frames.push({
        delayMs: ANIMATION_CONFIG.walkStepDelayMs,
        execute: () => {},
        tag: "walk-settle",
      });
    }

    this.playback.play(frames, () => {
      this.isWalking = false;
      this.hasFinishedWalking = true;
      this.playbackStatus = "idle";
      this.notify();
    });
  }

  // --- Scenario Loading & Instant Solving ---

  public loadPreset(
    presetId: ScenarioPresetId,
    options?: { instantSolve?: boolean },
  ): void {
    const preset = getScenarioPreset(presetId);
    if (!preset) return;
    this.loadScenario(preset.scenario, {
      name: preset.name,
      instantSolve: options?.instantSolve ?? true,
    });
  }

  public loadProcedural(
    seed: number,
    options?: { instantSolve?: boolean; rows?: number; cols?: number },
  ): void {
    const scenario = generateProceduralScenario({
      seed,
      rows: options?.rows ?? 25,
      cols: options?.cols ?? 25,
      numHills: 3,
      numMudPatches: 3,
      obstacleDensity: 0.08,
    });
    this.loadScenario(scenario, {
      name: `Seed #${seed}`,
      instantSolve: options?.instantSolve ?? true,
    });
  }

  public loadScenario(
    scenario: Scenario,
    options: {
      name?: string;
      instantSolve?: boolean;
    } = {},
  ): void {
    const { name = "Test Scenario", instantSolve = true } = options;

    this.clearTimers();
    this.visualizer.clearSearchVisuals();

    this.isFixedDimensions = true;
    this.loadedScenarioName = name;
    this.cols = scenario.cols ?? 25;
    this.rows = scenario.rows ?? 25;

    this.terrain.loadScenario(scenario);

    this.robotHeading = scenario.initialHeading ?? VEHICLE_CONFIG.defaultHeading;
    this.initialScenarioHeading = this.robotHeading;
    this.maxTraversableSlope =
      scenario.maxTraversableSlope ??
      scenario.robotPhysics?.maxTraversableSlope ??
      this.defaultMaxTraversableSlope;

    if (this.terrain.getElevations().size > 0) {
      this.showGradients = true;
    }

    this.walkingStep = -1;
    this.isWalking = false;
    this.hasFinishedWalking = false;
    this.walkFailure = null;

    this.resetActorsVisuals();

    if (instantSolve) {
      this.solveInstantly(this.selectedAlgo);
    } else {
      this.isPathVisible = false;
      this.currentPath = null;
      this.pathMetrics = null;
      this.isManhattanFinished = false;
      this.isEnergyFinished = false;
      this.playbackStatus = "idle";
      this.notify();
    }
  }

  public solveInstantly(algoToRun?: AlgorithmType): void {
    const algo = algoToRun ?? this.selectedAlgo;
    this.clearTimers();
    this.visualizer.clearSearchVisuals();

    this.isWalking = false;
    this.hasFinishedWalking = false;
    this.walkFailure = null;
    this.walkingStep = -1;

    this.resetActorsVisuals();

    const scenario = this.getScenario();

    const algoConfigs: Record<AlgorithmType, { name: string; theme: "manhattan" | "energy" }> = {
      energyAware: { name: "Energy-Aware", theme: "energy" },
      manhattan: { name: "Manhattan", theme: "manhattan" },
      euclidean: { name: "Euclidean", theme: "energy" },
      octile: { name: "Octile", theme: "energy" },
      chebyshev: { name: "Chebyshev", theme: "energy" },
    };

    const config = algoConfigs[algo];
    const theme = config.theme;
    const result = findPath(scenario, { algorithm: algo, use3DStandard: this.use3DStandard });
    const { shortestPath, totalEnergy, totalDistance, energyBreakdown } = result;
    const safety = evaluatePathSafety(shortestPath, scenario);
    const algoName =
      algo === "energyAware"
        ? config.name
        : this.use3DStandard
          ? `${config.name} (3D)`
          : config.name;

    this.pathMetrics = {
      algorithm: algoName,
      distance: totalDistance,
      energy: totalEnergy,
      energyBreakdown,
      isSafe: safety.isSafe,
      safetyFailureReason: safety.failureReason,
    };

    this.currentPath = shortestPath.length > 0 ? shortestPath : null;
    this.isAnimating = false;
    this.isPathVisible = shortestPath.length > 0;
    this.pathTheme = theme;
    this.playbackStatus = "idle";

    if (theme === "manhattan") {
      this.isManhattanFinished = true;
      this.isEnergyFinished = false;
    } else {
      this.isEnergyFinished = true;
      this.isManhattanFinished = false;
    }

    this.notify();
  }

  public resetToFreeform(cols?: number, rows?: number, cellSize?: number): void {
    this.isFixedDimensions = false;
    this.loadedScenarioName = null;
    this.maxTraversableSlope = this.defaultMaxTraversableSlope;
    this.initialScenarioHeading = VEHICLE_CONFIG.defaultHeading;
    this.robotHeading = this.initialHeading;
    this.showGradients = false;

    let targetCols = cols ?? this.freeformCols;
    let targetRows = rows ?? this.freeformRows;
    let targetCellSize = cellSize ?? this.freeformCellSize;

    if (!cols && typeof window !== "undefined" && window.innerWidth > 0 && window.innerHeight > 0) {
      const fallbackCellSize =
        window.innerWidth < GRID_CONFIG.mobileBreakpoint
          ? GRID_CONFIG.mobileCellSize
          : GRID_CONFIG.defaultCellSize;
      targetCellSize = cellSize ?? fallbackCellSize;
      targetCols = Math.floor(window.innerWidth / targetCellSize);
      targetRows = Math.floor(window.innerHeight / targetCellSize);
    }

    this.cols = targetCols;
    this.rows = targetRows;
    this.cellSize = targetCellSize;
    this.freeformCols = targetCols;
    this.freeformRows = targetRows;
    this.freeformCellSize = targetCellSize;

    this.terrain.resetNodes({
      rows: this.rows,
      cols: this.cols,
      initialRobotNode: this.initialRobotNode,
      initialDestinationNode: this.initialDestinationNode,
    });

    this.reset();
  }

  // --- Reset Simulation State ---

  public reset(): void {
    this.clearTimers();
    this.visualizer.clearSearchVisuals();

    const keysToClean = this.terrain.clearAll();
    this.visualizer.clearAllCellPreviews(keysToClean);

    if (!this.isFixedDimensions) {
      this.maxTraversableSlope = this.defaultMaxTraversableSlope;
      this.initialScenarioHeading = VEHICLE_CONFIG.defaultHeading;
    }

    this.isManhattanFinished = false;
    this.isEnergyFinished = false;
    this.isAnimating = false;
    this.showManhattanSearch = true;
    this.showEnergySearch = true;
    this.isPathVisible = false;
    this.pathTheme = null;
    this.playbackStatus = "idle";

    this.currentPath = null;
    this.walkingStep = -1;
    this.isWalking = false;
    this.hasFinishedWalking = false;
    this.walkFailure = null;
    this.pathMetrics = null;

    this.resetActorsVisuals();

    this.notify();
  }

  public destroy(): void {
    this.clearTimers();
    this.listeners.clear();
  }
}
