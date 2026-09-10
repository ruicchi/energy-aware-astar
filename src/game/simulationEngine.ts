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
  getElevationGradient,
  getHeading,
  isTraversableSlope,
  evaluatePathSafety,
} from "../physics/terrainPhysics";
import { findPath } from "../algorithms/astar";

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
  updateRobotPosition?: (col: number, row: number, cellSize: number) => void;
  updateRobotHeading?: (heading: Heading) => void;
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
    updateRobotPosition(col: number, row: number, cellSize: number) {
      if (typeof document === "undefined") return;
      const node = document.getElementById("robot-actor");
      if (node) {
        node.style.transform = `translate3d(${col * cellSize}px, ${row * cellSize}px, 0)`;
      }
    },
    updateRobotHeading(heading: Heading) {
      if (typeof document === "undefined") return;
      const node = document.getElementById("robot-actor-arrow");
      if (node) {
        node.style.display = heading && heading !== "NONE" ? "block" : "none";
        node.style.transform = `rotate(${getHeadingRotation(heading)})`;
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

interface ActiveStrokeSession {
  brush: BrushMode | "robot" | "destination";
  drawValue: number | boolean | null;
  modifiedCells: Set<string>;
  previousSnapshot: {
    wallNodes: Set<string>;
    terrainFactors: Map<string, number>;
    terrainTypes: Map<string, "dirt" | "water">;
    elevations: Map<string, number>;
    robotNode: string;
    destinationNode: string;
  };
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

  private strokeSession: ActiveStrokeSession | null = null;
  private domAdapter: SimulationDomAdapter;
  private listeners: Set<() => void> = new Set();
  private activeTimeouts: ReturnType<typeof setTimeout>[] = [];
  private currentRunId: number = 0;
  private cachedSnapshot: SimulationState | null = null;

  constructor(options: SimulationEngineOptions = {}) {
    this.cols = options.cols ?? GRID_CONFIG.defaultCols;
    this.rows = options.rows ?? GRID_CONFIG.defaultRows;
    this.cellSize = options.cellSize ?? GRID_CONFIG.defaultCellSize;

    const defaultRobotCol = Math.floor(this.cols / 4);
    const defaultDestCol = Math.floor((this.cols / 4) * 3);
    const defaultRow = Math.floor(this.rows / 2);

    this.robotNode = options.initialRobotNode ?? `${defaultRow}-${defaultRobotCol}`;
    this.destinationNode = options.initialDestinationNode ?? `${defaultRow}-${defaultDestCol}`;
    this.wallNodes = new Set(options.initialWallNodes ?? []);
    this.terrainFactors = new Map(options.initialTerrainFactors ?? []);
    this.terrainTypes = new Map(options.initialTerrainTypes ?? []);
    this.elevations = new Map(options.initialElevations ?? []);
    this.robotHeading = options.initialHeading ?? VEHICLE_CONFIG.defaultHeading;
    this.selectedAlgo = options.initialAlgo ?? "energyAware";
    this.domAdapter = options.domAdapter ?? createDefaultDomAdapter();

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
      activeStrokeBrush: this.strokeSession?.brush ?? null,
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

  public setDimensions(cols: number, rows: number, cellSize: number): void {
    if (this.isFixedDimensions) {
      if (this.cellSize !== cellSize) {
        this.cellSize = cellSize;
        this.notify();
      }
      return;
    }
    if (cols === this.cols && rows === this.rows && cellSize === this.cellSize) return;
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
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
    this.notify();
  }

  public setSelectedAlgo(algo: AlgorithmType, instantSolveIfPathVisible = true): void {
    if (this.selectedAlgo === algo) return;
    this.selectedAlgo = algo;
    if (algo !== "energyAware") {
      this.robotHeading = "NONE";
    } else if (this.loadedScenarioName && this.initialScenarioHeading !== "NONE") {
      this.robotHeading = this.initialScenarioHeading;
    }

    if (
      instantSolveIfPathVisible &&
      (this.isPathVisible || Boolean(this.currentPath && this.currentPath.length > 0)) &&
      !this.isAnimating &&
      !this.isWalking
    ) {
      this.solveInstantly(algo);
    } else {
      this.notify();
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

  // --- Transient Pointer & Stroke Buffering (absorbed from GridPaintBuffer) ---

  public isSessionActive(): boolean {
    return this.strokeSession !== null;
  }

  public startPaint(key: string): void {
    if (this.isAnimating || this.isWalking) return;

    if (this.currentPath || this.isManhattanFinished || this.isEnergyFinished) {
      this.clearAnimations();
    }

    const previousSnapshot = {
      wallNodes: new Set(this.wallNodes),
      terrainFactors: new Map(this.terrainFactors),
      terrainTypes: new Map(this.terrainTypes),
      elevations: new Map(this.elevations),
      robotNode: this.robotNode,
      destinationNode: this.destinationNode,
    };

    if (key === this.robotNode) {
      this.strokeSession = {
        brush: "robot",
        drawValue: null,
        modifiedCells: new Set(),
        previousSnapshot,
      };
      this.notify();
      return;
    }

    if (key === this.destinationNode) {
      this.strokeSession = {
        brush: "destination",
        drawValue: null,
        modifiedCells: new Set(),
        previousSnapshot,
      };
      this.notify();
      return;
    }

    let calculatedDrawValue: number | boolean | null = null;

    if (this.activeBrush === "wall") {
      calculatedDrawValue = !this.wallNodes.has(key);
    } else if (this.activeBrush === "dirt") {
      const currentType = this.terrainTypes.get(key);
      const currentCost = this.terrainFactors.get(key);
      const isCurrentDirt =
        !this.wallNodes.has(key) &&
        (currentType === "dirt" ||
          (!currentType && currentCost === TERRAIN_CONFIG.types.dirt.cost));
      calculatedDrawValue =
        isCurrentDirt && currentCost === this.dirtBrushValue ? 0 : this.dirtBrushValue;
    } else if (this.activeBrush === "water") {
      const currentType = this.terrainTypes.get(key);
      const currentCost = this.terrainFactors.get(key);
      const isCurrentWater =
        !this.wallNodes.has(key) &&
        (currentType === "water" ||
          (!currentType && currentCost === TERRAIN_CONFIG.types.water.cost));
      calculatedDrawValue =
        isCurrentWater && currentCost === this.waterBrushValue ? 0 : this.waterBrushValue;
    } else if (this.activeBrush === "elevation") {
      const current = this.wallNodes.has(key) ? 0 : (this.elevations.get(key) ?? 0);
      calculatedDrawValue =
        current === this.elevationBrushValue ? 0 : this.elevationBrushValue;
    }

    this.strokeSession = {
      brush: this.activeBrush,
      drawValue: calculatedDrawValue,
      modifiedCells: new Set(),
      previousSnapshot,
    };

    this.applyStrokeToCell(key);
  }

  public continuePaint(key: string): void {
    if (!this.strokeSession) return;

    const { brush } = this.strokeSession;

    if (brush === "robot") {
      if (key !== this.destinationNode && !this.wallNodes.has(key)) {
        if (this.robotNode === key) return;
        const [r, c] = parseCoordinates(key);
        if (!getElevationGradient(r, c, this.elevations).isUnstable) {
          this.robotNode = key;
          this.notify();
        }
      }
      return;
    }

    if (brush === "destination") {
      if (key !== this.robotNode && !this.wallNodes.has(key)) {
        if (this.destinationNode === key) return;
        const [r, c] = parseCoordinates(key);
        if (!getElevationGradient(r, c, this.elevations).isUnstable) {
          this.destinationNode = key;
          this.notify();
        }
      }
      return;
    }

    if (key === this.robotNode || key === this.destinationNode) {
      if (brush === "elevation") {
        const testElevations = new Map(this.elevations);
        testElevations.set(key, this.strokeSession.drawValue as number);
        const [r, c] = parseCoordinates(key);
        if (getElevationGradient(r, c, testElevations).isUnstable) {
          return;
        }
      } else {
        return;
      }
    }

    this.applyStrokeToCell(key);
  }

  public endPaint(): void {
    if (!this.strokeSession) return;

    // Clear inline preview styles so React declarative state styling takes over
    for (const key of this.strokeSession.modifiedCells) {
      const element = this.domAdapter.getCellElement(key);
      if (element) {
        element.style.backgroundColor = "";
      }
    }

    this.strokeSession = null;
    this.notify();
  }

  public abortPaint(): void {
    if (!this.strokeSession) return;

    this.wallNodes = this.strokeSession.previousSnapshot.wallNodes;
    this.terrainFactors = this.strokeSession.previousSnapshot.terrainFactors;
    this.terrainTypes = this.strokeSession.previousSnapshot.terrainTypes;
    this.elevations = this.strokeSession.previousSnapshot.elevations;
    this.robotNode = this.strokeSession.previousSnapshot.robotNode;
    this.destinationNode = this.strokeSession.previousSnapshot.destinationNode;

    for (const key of this.strokeSession.modifiedCells) {
      const element = this.domAdapter.getCellElement(key);
      if (element) {
        element.style.backgroundColor = "";
        if (this.wallNodes.has(key)) {
          element.classList.add("is-wall");
        } else {
          element.classList.remove("is-wall");
        }
      }
    }

    this.strokeSession = null;
    this.notify();
  }

  public clearWalls(): void {
    for (const key of this.wallNodes) {
      const element = this.domAdapter.getCellElement(key);
      if (element) {
        element.style.backgroundColor = "";
        element.classList.remove("is-wall");
      }
    }

    if (this.strokeSession) {
      for (const key of this.strokeSession.modifiedCells) {
        const element = this.domAdapter.getCellElement(key);
        if (element) {
          element.style.backgroundColor = "";
          element.classList.remove("is-wall");
        }
      }
      this.strokeSession = null;
    }

    this.wallNodes = new Set();
    this.terrainFactors = new Map();
    this.terrainTypes = new Map();
    this.elevations = new Map();

    this.notify();
  }

  private applyStrokeToCell(key: string): void {
    if (!this.strokeSession) return;

    const { brush, drawValue } = this.strokeSession;

    if (brush === "wall") {
      const isWall = Boolean(drawValue);
      const nextWallNodes = new Set(this.wallNodes);
      if (isWall) {
        nextWallNodes.add(key);
        if (this.terrainFactors.has(key) || this.terrainTypes.has(key)) {
          const nextFactors = new Map(this.terrainFactors);
          const nextTypes = new Map(this.terrainTypes);
          nextFactors.delete(key);
          nextTypes.delete(key);
          this.terrainFactors = nextFactors;
          this.terrainTypes = nextTypes;
        }
        if (this.elevations.has(key)) {
          const nextElevations = new Map(this.elevations);
          nextElevations.delete(key);
          this.elevations = nextElevations;
        }
      } else {
        nextWallNodes.delete(key);
      }
      this.wallNodes = nextWallNodes;
      this.strokeSession.modifiedCells.add(key);
      this.applyVisual(key, "wall", isWall);
    } else if (brush === "dirt") {
      const val = Number(drawValue);
      const nextFactors = new Map(this.terrainFactors);
      const nextTypes = new Map(this.terrainTypes);
      if (this.wallNodes.has(key)) {
        const nextWallNodes = new Set(this.wallNodes);
        nextWallNodes.delete(key);
        this.wallNodes = nextWallNodes;
      }
      if (this.elevations.has(key)) {
        const nextElevations = new Map(this.elevations);
        nextElevations.delete(key);
        this.elevations = nextElevations;
      }
      if (val === 0) {
        nextFactors.delete(key);
        nextTypes.delete(key);
      } else {
        nextFactors.set(key, val);
        nextTypes.set(key, "dirt");
      }
      this.terrainFactors = nextFactors;
      this.terrainTypes = nextTypes;
      this.strokeSession.modifiedCells.add(key);
      this.applyVisual(key, "dirt", val);
    } else if (brush === "water") {
      const val = Number(drawValue);
      const nextFactors = new Map(this.terrainFactors);
      const nextTypes = new Map(this.terrainTypes);
      if (this.wallNodes.has(key)) {
        const nextWallNodes = new Set(this.wallNodes);
        nextWallNodes.delete(key);
        this.wallNodes = nextWallNodes;
      }
      if (this.elevations.has(key)) {
        const nextElevations = new Map(this.elevations);
        nextElevations.delete(key);
        this.elevations = nextElevations;
      }
      if (val === 0) {
        nextFactors.delete(key);
        nextTypes.delete(key);
      } else {
        nextFactors.set(key, val);
        nextTypes.set(key, "water");
      }
      this.terrainFactors = nextFactors;
      this.terrainTypes = nextTypes;
      this.strokeSession.modifiedCells.add(key);
      this.applyVisual(key, "water", val);
    } else if (brush === "elevation") {
      const val = Number(drawValue);
      const nextElevations = new Map(this.elevations);
      if (this.wallNodes.has(key)) {
        const nextWallNodes = new Set(this.wallNodes);
        nextWallNodes.delete(key);
        this.wallNodes = nextWallNodes;
      }
      if (this.terrainFactors.has(key) || this.terrainTypes.has(key)) {
        const nextFactors = new Map(this.terrainFactors);
        const nextTypes = new Map(this.terrainTypes);
        nextFactors.delete(key);
        nextTypes.delete(key);
        this.terrainFactors = nextFactors;
        this.terrainTypes = nextTypes;
      }
      if (val === 0) {
        nextElevations.delete(key);
      } else {
        nextElevations.set(key, val);
      }
      this.elevations = nextElevations;
      this.strokeSession.modifiedCells.add(key);
      this.applyVisual(key, "elevation", val);
    }
  }

  private applyVisual(
    key: string,
    mode: "wall" | "dirt" | "water" | "elevation",
    value: number | boolean,
  ): void {
    const element = this.domAdapter.getCellElement(key);
    if (!element) return;

    if (mode === "wall") {
      if (value) {
        element.classList.add("is-wall");
        element.style.backgroundColor = TERRAIN_CONFIG.types.wall.color;
      } else {
        element.classList.remove("is-wall");
        element.style.backgroundColor = "";
      }
    } else if (mode === "dirt") {
      element.classList.remove("is-wall");
      if (value) {
        element.style.backgroundColor = TERRAIN_CONFIG.types.dirt.color;
      } else {
        element.style.backgroundColor = "";
      }
    } else if (mode === "water") {
      element.classList.remove("is-wall");
      if (value) {
        element.style.backgroundColor = TERRAIN_CONFIG.types.water.color;
      } else {
        element.style.backgroundColor = "";
      }
    } else if (mode === "elevation") {
      element.classList.remove("is-wall");
      if (value) {
        element.style.backgroundColor = TERRAIN_CONFIG.getElevationColor(Number(value));
      } else {
        element.style.backgroundColor = "";
      }
    }
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

    const [startR, startC] = this.robotNode.split("-").map(Number);
    this.domAdapter.updateRobotPosition?.(startC, startR, this.cellSize);
    this.domAdapter.updateRobotHeading?.(this.robotHeading);

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
    this.domAdapter.updateRobotPosition?.(startC, startR, this.cellSize);
    this.domAdapter.updateRobotHeading?.(this.robotHeading);

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
          this.domAdapter.updateRobotHeading?.(nextHeading);
        }, cumulativeDelay);
        this.activeTimeouts.push(rotateTimeout);

        cumulativeDelay += ANIMATION_CONFIG.walkRotateDelayMs;
        currentRobotHeading = nextHeading;
      }

      const moveTimeout = setTimeout(() => {
        if (runId !== this.currentRunId) return;
        this.walkingStep = i;
        this.domAdapter.updateRobotPosition?.(currC, currR, this.cellSize);

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

    // Clear old wall classes from DOM
    for (const key of this.wallNodes) {
      const element = this.domAdapter.getCellElement(key);
      if (element) {
        element.style.backgroundColor = "";
        element.classList.remove("is-wall");
      }
    }

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
    this.domAdapter.updateRobotPosition?.(startC, startR, this.cellSize);
    this.domAdapter.updateRobotHeading?.(this.robotHeading);

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
    this.domAdapter.updateRobotPosition?.(startC, startR, this.cellSize);
    this.domAdapter.updateRobotHeading?.(this.robotHeading);

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
    if (cols) this.cols = cols;
    if (rows) this.rows = rows;
    if (cellSize) this.cellSize = cellSize;
    this.reset();
  }

  // --- Reset Simulation State ---

  public reset(): void {
    this.currentRunId += 1;
    this.clearTimers();
    this.domAdapter.clearAllSearchVisuals();

    this.clearWalls();

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
    this.domAdapter.updateRobotPosition?.(startC, startR, this.cellSize);
    this.domAdapter.updateRobotHeading?.(this.robotHeading);

    this.notify();
  }

  public destroy(): void {
    this.clearTimers();
    this.listeners.clear();
  }
}
