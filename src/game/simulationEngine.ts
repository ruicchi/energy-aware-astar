import type {
  Scenario,
  Heading,
  BrushMode,
  AlgorithmType,
  EnergyBreakdown,
} from "../shared/types";
import {
  VEHICLE_CONFIG,
  ENERGY_CONFIG,
  TERRAIN_CONFIG,
  ANIMATION_CONFIG,
  GRID_CONFIG,
  BRUSH_CONFIG,
  getHeadingRotation,
} from "../config/simulationConfig";
import {
  getHeading,
  isTraversableSlope,
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
import { GridPaintBuffer, type TerrainStateHolder, type PaintContext } from "./gridPaintBuffer";

export {
  SCENARIO_PRESETS,
  type ScenarioPresetId,
  type ScenarioPresetDescriptor,
  GridPaintBuffer,
};

export interface SimulationDomElement {
  style: { backgroundColor: string };
  classList: {
    add: (className: string) => void;
    remove: (className: string) => void;
  };
  dataset: Record<string, string | undefined>;
}

export interface SimulationDomAdapter {
  getCellElement: (key: string) => SimulationDomElement | null;
  clearAllSearchVisuals: () => void;
  setRobotPosition: (col: number, row: number, cellSize: number, animated?: boolean) => void;
  setRobotHeading: (heading: Heading, animated?: boolean) => void;
  resetRobot: (col: number, row: number, heading: Heading, cellSize: number) => void;
}

export function createDefaultDomAdapter(): SimulationDomAdapter {
  return {
    getCellElement(key: string) {
      if (typeof document === "undefined") return null;
      return document.getElementById(`cell-${key}`) as unknown as SimulationDomElement | null;
    },
    clearAllSearchVisuals() {
      if (typeof document === "undefined") return;
      document.querySelectorAll("[data-manhattan], [data-energy], [data-path]").forEach((el) => {
        const node = el as HTMLElement;
        delete node.dataset.manhattan;
        delete node.dataset.energy;
        delete node.dataset.path;
      });
    },
    setRobotPosition(col: number, row: number, cellSize: number, animated = false) {
      if (typeof document === "undefined") return;
      const node = document.getElementById("robot-actor");
      if (node) {
        node.style.transition = animated ? "transform 0.2s linear" : "none";
        node.style.willChange = animated ? "transform" : "auto";
        node.style.transform = `translate3d(${col * cellSize}px, ${row * cellSize}px, 0)`;
      }
    },
    setRobotHeading(heading: Heading, animated = false) {
      if (typeof document === "undefined") return;
      const node = document.getElementById("robot-actor-arrow");
      if (node) {
        node.style.display = heading && heading !== "NONE" ? "block" : "none";
        node.style.transition = animated ? "transform 0.2s ease-in-out" : "none";
        node.style.transform = `rotate(${getHeadingRotation(heading)})`;
      }
    },
    resetRobot(col: number, row: number, heading: Heading, cellSize: number) {
      if (typeof document === "undefined") return;
      const node = document.getElementById("robot-actor");
      if (node) {
        node.style.transition = "none";
        node.style.willChange = "auto";
        node.style.transform = `translate3d(${col * cellSize}px, ${row * cellSize}px, 0)`;
      }
      const arrowNode = document.getElementById("robot-actor-arrow");
      if (arrowNode) {
        arrowNode.style.display = heading && heading !== "NONE" ? "block" : "none";
        arrowNode.style.transition = "none";
        arrowNode.style.transform = `rotate(${getHeadingRotation(heading)})`;
      }
    },
  };
}

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
  showGradients: boolean;
  robotHeading: Heading;
  selectedAlgo: AlgorithmType;

  // Playback & Animation State
  playbackStatus: "idle" | "searching" | "walking";
  isAnimating: boolean;
  isWalking: boolean;
  hasFinishedWalking: boolean;
  isLocked: boolean;

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
  domAdapter?: SimulationDomAdapter;
}

function parseCoordinates(key: string): [number, number] {
  const parts = key.split("-");
  return [Number(parts[0]), Number(parts[1])];
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
  private maxTraversableSlope: number | null = null;
  private initialScenarioHeading: Heading = VEHICLE_CONFIG.defaultHeading;
  private initialHeading: Heading = VEHICLE_CONFIG.defaultHeading;
  private freeformCols: number;
  private freeformRows: number;
  private freeformCellSize: number;
  private initialRobotNode: string | null = null;
  private initialDestinationNode: string | null = null;

  private wallNodes: Set<string>;
  private terrainFactors: Map<string, number>;
  private terrainTypes: Map<string, "dirt" | "water">;
  private elevations: Map<string, number>;
  private robotNode: string;
  private destinationNode: string;

  private activeBrush: BrushMode = "wall";
  private elevationBrushValue: number = BRUSH_CONFIG.elevation.defaultValue;
  private dirtBrushValue: number = BRUSH_CONFIG.dirt.defaultValue;
  private waterBrushValue: number = BRUSH_CONFIG.water.defaultValue;
  private showGradients: boolean = false;
  private robotHeading: Heading = VEHICLE_CONFIG.defaultHeading;
  private selectedAlgo: AlgorithmType = "energyAware";

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

  private paintBuffer: GridPaintBuffer;
  private domAdapter: SimulationDomAdapter;
  private listeners: Set<() => void> = new Set();
  private activeTimeouts: ReturnType<typeof setTimeout>[] = [];
  private currentRunId: number = 0;
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

    const defaultRobotCol = Math.floor(this.cols / 4);
    const defaultDestCol = Math.floor((this.cols / 4) * 3);
    const defaultRow = Math.floor(this.rows / 2);

    this.robotNode = options.initialRobotNode ?? `${defaultRow}-${defaultRobotCol}`;
    this.destinationNode = options.initialDestinationNode ?? `${defaultRow}-${defaultDestCol}`;
    this.wallNodes = new Set(options.initialWallNodes ?? []);
    this.terrainFactors = new Map(options.initialTerrainFactors ?? []);
    this.terrainTypes = new Map(options.initialTerrainTypes ?? []);
    this.elevations = new Map(options.initialElevations ?? []);
    this.robotHeading = this.initialHeading;
    this.selectedAlgo = options.initialAlgo ?? "energyAware";
    this.domAdapter = options.domAdapter ?? createDefaultDomAdapter();
    this.paintBuffer = new GridPaintBuffer(this.domAdapter);

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

    this.cachedSnapshot = {
      cols: this.cols,
      rows: this.rows,
      cellSize: this.cellSize,
      isFixedDimensions: this.isFixedDimensions,
      loadedScenarioName: this.loadedScenarioName,
      wallNodes: this.wallNodes,
      terrainFactors: this.terrainFactors,
      terrainTypes: this.terrainTypes,
      elevations: this.elevations,
      robotNode: this.robotNode,
      destinationNode: this.destinationNode,
      activeBrush: this.activeBrush,
      elevationBrushValue: this.elevationBrushValue,
      dirtBrushValue: this.dirtBrushValue,
      waterBrushValue: this.waterBrushValue,
      showGradients: this.showGradients,
      robotHeading: this.robotHeading,
      selectedAlgo: this.selectedAlgo,
      playbackStatus: this.playbackStatus,
      isAnimating: this.isAnimating,
      isWalking: this.isWalking,
      hasFinishedWalking: this.hasFinishedWalking,
      isLocked: this.isAnimating || this.isWalking,
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
      activeStrokeBrush: this.paintBuffer.getActiveStrokeBrush(),
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

  public setDimensions(cols: number, rows: number, cellSize: number): void {
    if (this.isFixedDimensions) {
      if (this.cellSize !== cellSize) {
        this.cellSize = cellSize;
        const [startR, startC] = this.robotNode.split("-").map(Number);
        this.domAdapter.resetRobot(startC, startR, this.robotHeading, this.cellSize);
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

    const [startR, startC] = this.robotNode.split("-").map(Number);
    const clampedRobotR = Math.min(Math.max(0, startR), rows - 1);
    const clampedRobotC = Math.min(Math.max(0, startC), cols - 1);
    this.robotNode = `${clampedRobotR}-${clampedRobotC}`;

    const [destR, destC] = this.destinationNode.split("-").map(Number);
    const clampedDestR = Math.min(Math.max(0, destR), rows - 1);
    const clampedDestC = Math.min(Math.max(0, destC), cols - 1);
    this.destinationNode = `${clampedDestR}-${clampedDestC}`;

    this.domAdapter.resetRobot(clampedRobotC, clampedRobotR, this.robotHeading, this.cellSize);
    this.notify();
  }

  // --- Scenario Query ---

  public getScenario(): Scenario {
    return {
      rows: this.rows,
      cols: this.cols,
      robotNode: this.robotNode,
      destinationNode: this.destinationNode,
      wallNodes: this.wallNodes,
      terrainFactors: this.terrainFactors,
      terrainTypes: this.terrainTypes,
      elevations: this.elevations,
      climbingFactor: ENERGY_CONFIG.climbingFactor,
      turnPenalty: ENERGY_CONFIG.turnPenalty,
      maxTraversableSlope: this.maxTraversableSlope ?? TERRAIN_CONFIG.defaultMaxTraversableSlope,
      initialHeading: this.robotHeading,
      showGradients: this.showGradients,
      robotPhysics: VEHICLE_CONFIG,
    };
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
    let changed = false;
    const next = new Map(this.terrainFactors);
    for (const [k, type] of this.terrainTypes.entries()) {
      if (type === "dirt" && next.get(k) !== val) {
        next.set(k, val);
        changed = true;
      }
    }
    if (changed) {
      this.terrainFactors = next;
    }
    this.notify();
  }

  public setWaterBrushValue(val: number): void {
    if (this.waterBrushValue === val) return;
    this.waterBrushValue = val;
    let changed = false;
    const next = new Map(this.terrainFactors);
    for (const [k, type] of this.terrainTypes.entries()) {
      if (type === "water" && next.get(k) !== val) {
        next.set(k, val);
        changed = true;
      }
    }
    if (changed) {
      this.terrainFactors = next;
    }
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
    this.domAdapter.setRobotHeading(heading, false);
    this.notify();
  }

  public setSelectedAlgo(algo: AlgorithmType, instantSolveIfPathVisible = true): void {
    if (this.selectedAlgo === algo) return;
    this.selectedAlgo = algo;
    if (algo !== "energyAware") {
      this.robotHeading = "NONE";
      this.domAdapter.setRobotHeading("NONE", false);
    } else if (this.loadedScenarioName && this.initialScenarioHeading !== "NONE") {
      this.robotHeading = this.initialScenarioHeading;
      this.domAdapter.setRobotHeading(this.robotHeading, false);
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

  public toggleManhattanSearch(): void {
    this.showManhattanSearch = !this.showManhattanSearch;
    this.notify();
  }

  public toggleEnergySearch(): void {
    this.showEnergySearch = !this.showEnergySearch;
    this.notify();
  }

  // --- Transient Pointer & Stroke Buffering (delegated to GridPaintBuffer) ---

  public isSessionActive(): boolean {
    return this.paintBuffer.isSessionActive();
  }

  private getTerrainTarget(): TerrainStateHolder {
    return {
      wallNodes: this.wallNodes,
      terrainFactors: this.terrainFactors,
      terrainTypes: this.terrainTypes,
      elevations: this.elevations,
      robotNode: this.robotNode,
      destinationNode: this.destinationNode,
    };
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

  private syncFromTerrainTarget(target: TerrainStateHolder): void {
    this.wallNodes = target.wallNodes;
    this.terrainFactors = target.terrainFactors;
    this.terrainTypes = target.terrainTypes;
    this.elevations = target.elevations;
    this.robotNode = target.robotNode;
    this.destinationNode = target.destinationNode;
  }

  public startPaint(key: string): void {
    if (this.isAnimating || this.isWalking) return;

    if (this.currentPath || this.isManhattanFinished || this.isEnergyFinished) {
      this.clearAnimations();
    }

    const target = this.getTerrainTarget();
    const context = this.getPaintContext();

    const started = this.paintBuffer.startStroke(key, target, context);
    if (started) {
      this.syncFromTerrainTarget(target);
      this.notify();
    }
  }

  public continuePaint(key: string): void {
    const target = this.getTerrainTarget();
    const context = this.getPaintContext();

    const modified = this.paintBuffer.continueStroke(key, target, context);
    if (modified) {
      this.syncFromTerrainTarget(target);
      if (this.isPathVisible) {
        this.solveInstantly(this.selectedAlgo);
      }
      this.notify();
    }
  }

  public endPaint(): void {
    const ended = this.paintBuffer.endStroke();
    if (ended) {
      if (this.isPathVisible) {
        this.solveInstantly(this.selectedAlgo);
      }
      this.notify();
    }
  }

  public abortPaint(): void {
    const target = this.getTerrainTarget();
    const restoredSnapshot = this.paintBuffer.abortStroke(target);
    if (restoredSnapshot) {
      this.syncFromTerrainTarget(target);
      if (this.isPathVisible) {
        this.solveInstantly(this.selectedAlgo);
      }
      this.notify();
    }
  }

  private clearWallsInternal(): void {
    const keysToClean = new Set<string>([
      ...this.wallNodes,
      ...this.terrainFactors.keys(),
      ...this.terrainTypes.keys(),
      ...this.elevations.keys(),
      ...this.paintBuffer.getModifiedCells(),
    ]);

    for (const key of keysToClean) {
      const element = this.domAdapter.getCellElement(key);
      if (element) {
        element.style.backgroundColor = "";
        element.classList.remove("is-wall");
      }
    }

    this.paintBuffer.endStroke();
    this.wallNodes = new Set();
    this.terrainFactors = new Map();
    this.terrainTypes = new Map();
    this.elevations = new Map();
  }

  public clearWalls(): void {
    this.clearWallsInternal();
    this.notify();
  }

  // --- Animation & Timer Management ---

  private clearTimers(): void {
    for (const id of this.activeTimeouts) {
      clearTimeout(id);
    }
    this.activeTimeouts = [];
  }

  public clearAnimations(): void {
    this.clearTimers();
    this.domAdapter.clearAllSearchVisuals();

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

    const [startR, startC] = this.robotNode.split("-").map(Number);
    this.domAdapter.resetRobot(startC, startR, this.robotHeading, this.cellSize);

    this.notify();
  }

  // --- Pathfinding Visualization ---

  public visualize(algoToRun?: AlgorithmType): void {
    const algo = algoToRun ?? this.selectedAlgo;
    this.currentRunId += 1;
    const runId = this.currentRunId;

    this.clearTimers();
    this.domAdapter.clearAllSearchVisuals();

    this.isManhattanFinished = false;
    this.isEnergyFinished = false;
    this.isWalking = false;
    this.hasFinishedWalking = false;
    this.walkFailure = null;
    this.walkingStep = -1;

    const [startR, startC] = this.robotNode.split("-").map(Number);
    this.domAdapter.resetRobot(startC, startR, this.robotHeading, this.cellSize);

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
    const result = findPath(scenario, { algorithm: algo });

    const { visitedNodesInOrder, shortestPath, totalEnergy, totalDistance, energyBreakdown } =
      result;

    const safety = evaluatePathSafety(shortestPath, scenario);

    this.pathMetrics = {
      algorithm: config.name,
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

    // Schedule visited search node animations
    for (let i = 0; i < visitedNodesInOrder.length; i++) {
      const timeout = setTimeout(() => {
        if (runId !== this.currentRunId) return;
        const { key, type } = visitedNodesInOrder[i];
        const node = this.domAdapter.getCellElement(key);
        if (node) {
          node.dataset[searchAttr] = type;
        }
      }, ANIMATION_CONFIG.searchStepDelayMs * i);
      this.activeTimeouts.push(timeout);
    }

    const pathDelay = visitedNodesInOrder.length * ANIMATION_CONFIG.searchStepDelayMs;

    const finishTimeout = setTimeout(() => {
      if (runId !== this.currentRunId) return;
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
    }, pathDelay);
    this.activeTimeouts.push(finishTimeout);
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

    this.currentRunId += 1;
    const runId = this.currentRunId;

    this.isWalking = true;
    this.hasFinishedWalking = false;
    this.walkFailure = null;
    this.walkingStep = 0;
    this.playbackStatus = "walking";
    this.notify();

    let cumulativeDelay = ANIMATION_CONFIG.walkStepDelayMs;
    let currentRobotHeading: Heading = this.robotHeading;
    const path = this.currentPath;
    const scenario = this.getScenario();

    for (let i = 1; i < path.length; i++) {
      const [prevR, prevC] = path[i - 1].split("-").map(Number);
      const [currR, currC] = path[i].split("-").map(Number);
      const nextHeading = getHeading(path[i - 1], path[i]);

      const isSafe = isTraversableSlope(
        { row: prevR, col: prevC },
        { row: currR, col: currC, heading: nextHeading },
        scenario,
      );

      if (!isSafe) {
        const failTimeout = setTimeout(() => {
          if (runId !== this.currentRunId) return;
          this.isWalking = false;
          this.hasFinishedWalking = true;
          this.playbackStatus = "idle";
          this.walkFailure = {
            row: currR,
            col: currC,
            reason: "ROBOT TIPPED OVER",
          };
          this.notify();
        }, cumulativeDelay);
        this.activeTimeouts.push(failTimeout);
        break;
      }

      if (
        currentRobotHeading !== "NONE" &&
        nextHeading !== "NONE" &&
        nextHeading !== currentRobotHeading
      ) {
        const rotateTimeout = setTimeout(() => {
          if (runId !== this.currentRunId) return;
          this.robotHeading = nextHeading;
          this.domAdapter.setRobotHeading(nextHeading, true);
        }, cumulativeDelay);
        this.activeTimeouts.push(rotateTimeout);

        cumulativeDelay += ANIMATION_CONFIG.walkRotateDelayMs;
        currentRobotHeading = nextHeading;
      }

      const moveTimeout = setTimeout(() => {
        if (runId !== this.currentRunId) return;
        this.walkingStep = i;
        this.domAdapter.setRobotPosition(currC, currR, this.cellSize, true);

        if (i === path.length - 1) {
          const finishTimeout = setTimeout(() => {
            if (runId !== this.currentRunId) return;
            this.isWalking = false;
            this.hasFinishedWalking = true;
            this.playbackStatus = "idle";
            this.notify();
          }, ANIMATION_CONFIG.walkStepDelayMs);
          this.activeTimeouts.push(finishTimeout);
        }
      }, cumulativeDelay);

      this.activeTimeouts.push(moveTimeout);
      cumulativeDelay += ANIMATION_CONFIG.walkStepDelayMs;
    }
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

    this.currentRunId += 1;
    this.clearTimers();
    this.domAdapter.clearAllSearchVisuals();

    // Clear old wall and terrain classes from DOM and memory
    this.clearWallsInternal();

    this.isFixedDimensions = true;
    this.loadedScenarioName = name;
    this.cols = scenario.cols ?? 25;
    this.rows = scenario.rows ?? 25;

    this.robotNode = scenario.robotNode;
    this.destinationNode = scenario.destinationNode;
    this.robotHeading = scenario.initialHeading ?? VEHICLE_CONFIG.defaultHeading;
    this.initialScenarioHeading = this.robotHeading;
    this.wallNodes = new Set(scenario.wallNodes);
    this.terrainFactors = new Map(scenario.terrainFactors);
    this.terrainTypes = new Map(scenario.terrainTypes ?? []);
    this.elevations = new Map(scenario.elevations);
    this.maxTraversableSlope = scenario.maxTraversableSlope ?? TERRAIN_CONFIG.defaultMaxTraversableSlope;

    if (this.elevations.size > 0) {
      this.showGradients = true;
    }

    this.walkingStep = -1;
    this.isWalking = false;
    this.hasFinishedWalking = false;
    this.walkFailure = null;

    const [startR, startC] = this.robotNode.split("-").map(Number);
    this.domAdapter.resetRobot(startC, startR, this.robotHeading, this.cellSize);

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
    this.domAdapter.clearAllSearchVisuals();

    this.isWalking = false;
    this.hasFinishedWalking = false;
    this.walkFailure = null;
    this.walkingStep = -1;

    const [startR, startC] = this.robotNode.split("-").map(Number);
    this.domAdapter.resetRobot(startC, startR, this.robotHeading, this.cellSize);

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
    const result = findPath(scenario, { algorithm: algo });
    const { shortestPath, totalEnergy, totalDistance, energyBreakdown } = result;
    const safety = evaluatePathSafety(shortestPath, scenario);

    this.pathMetrics = {
      algorithm: config.name,
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
    this.maxTraversableSlope = null;
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

    const defaultRobotCol = Math.floor(this.cols / 4);
    const defaultDestCol = Math.floor((this.cols / 4) * 3);
    const defaultRow = Math.floor(this.rows / 2);

    if (this.initialRobotNode) {
      const [r, c] = parseCoordinates(this.initialRobotNode);
      if (r < this.rows && c < this.cols) {
        this.robotNode = this.initialRobotNode;
      } else {
        this.robotNode = `${defaultRow}-${defaultRobotCol}`;
      }
    } else {
      this.robotNode = `${defaultRow}-${defaultRobotCol}`;
    }

    if (this.initialDestinationNode) {
      const [r, c] = parseCoordinates(this.initialDestinationNode);
      if (r < this.rows && c < this.cols) {
        this.destinationNode = this.initialDestinationNode;
      } else {
        this.destinationNode = `${defaultRow}-${defaultDestCol}`;
      }
    } else {
      this.destinationNode = `${defaultRow}-${defaultDestCol}`;
    }

    this.reset();
  }

  // --- Reset Simulation State ---

  public reset(): void {
    this.currentRunId += 1;
    this.clearTimers();
    this.domAdapter.clearAllSearchVisuals();

    this.clearWallsInternal();

    if (!this.isFixedDimensions) {
      this.maxTraversableSlope = null;
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

    const [startR, startC] = this.robotNode.split("-").map(Number);
    this.domAdapter.resetRobot(startC, startR, this.robotHeading, this.cellSize);

    this.notify();
  }

  public destroy(): void {
    this.clearTimers();
    this.listeners.clear();
  }
}
