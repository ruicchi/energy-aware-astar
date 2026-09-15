import type { BrushMode, Heading, Scenario } from "../shared/types";
import {
  TERRAIN_CONFIG,
  ENERGY_CONFIG,
  VEHICLE_CONFIG,
  GRID_CONFIG,
} from "../config/simulationConfig";

export interface TerrainSnapshot {
  wallNodes: Set<string>;
  terrainFactors: Map<string, number>;
  terrainTypes: Map<string, "dirt" | "water">;
  elevations: Map<string, number>;
  robotNode: string;
  destinationNode: string;
}

export interface PaintContext {
  activeBrush: BrushMode;
  elevationBrushValue: number;
  dirtBrushValue: number;
  waterBrushValue: number;
  robotHeading?: Heading;
  cellSize?: number;
}

export interface ActiveStrokeSession {
  brush: BrushMode | "robot" | "destination";
  drawValue: number | boolean | null;
  modifiedCells: Set<string>;
  previousSnapshot: TerrainSnapshot;
}

export interface CellPreview {
  color: string;
  isWall?: boolean;
}

export interface StrokeResult {
  modified: boolean;
  brush?: BrushMode | "robot" | "destination";
  cellKey?: string;
  preview?: CellPreview;
}

export interface RollbackCell {
  key: string;
  restoreWall: boolean;
}

export interface ScenarioTerrainOptions {
  cols?: number;
  rows?: number;
  initialRobotNode?: string;
  initialDestinationNode?: string;
  initialWallNodes?: Set<string>;
  initialTerrainFactors?: Map<string, number>;
  initialTerrainTypes?: Map<string, "dirt" | "water">;
  initialElevations?: Map<string, number>;
}

function parseCoordinates(key: string): [number, number] {
  const parts = key.split("-");
  return [Number(parts[0]), Number(parts[1])];
}

/**
 * The deep ScenarioTerrain module.
 * Encapsulates persistent grid topology, obstacle boundaries, terrain friction factors,
 * elevation distributions, actor placements, transactional pointer drawing sessions,
 * and atomic commit/rollback semantics across all grid layers.
 * Completely decoupled from visual rendering adapters.
 */
export class ScenarioTerrain {
  private cols: number;
  private rows: number;
  private wallNodes: Set<string>;
  private terrainFactors: Map<string, number>;
  private terrainTypes: Map<string, "dirt" | "water">;
  private elevations: Map<string, number>;
  private robotNode: string;
  private destinationNode: string;

  private strokeSession: ActiveStrokeSession | null = null;

  constructor(options: ScenarioTerrainOptions = {}) {
    this.cols = options.cols ?? GRID_CONFIG.defaultCols;
    this.rows = options.rows ?? GRID_CONFIG.defaultRows;

    const defaultRobotCol = Math.floor(this.cols / 4);
    const defaultDestCol = Math.floor((this.cols / 4) * 3);
    const defaultRow = Math.floor(this.rows / 2);

    this.robotNode = options.initialRobotNode ?? `${defaultRow}-${defaultRobotCol}`;
    this.destinationNode = options.initialDestinationNode ?? `${defaultRow}-${defaultDestCol}`;
    this.wallNodes = new Set(options.initialWallNodes ?? []);
    this.terrainFactors = new Map(options.initialTerrainFactors ?? []);
    this.terrainTypes = new Map(options.initialTerrainTypes ?? []);
    this.elevations = new Map(options.initialElevations ?? []);
  }

  // --- Snapshot and Query Interface ---

  public getSnapshot(): TerrainSnapshot {
    return {
      wallNodes: this.wallNodes,
      terrainFactors: this.terrainFactors,
      terrainTypes: this.terrainTypes,
      elevations: this.elevations,
      robotNode: this.robotNode,
      destinationNode: this.destinationNode,
    };
  }

  public getWallNodes(): ReadonlySet<string> {
    return this.wallNodes;
  }

  public getTerrainFactors(): ReadonlyMap<string, number> {
    return this.terrainFactors;
  }

  public getTerrainTypes(): ReadonlyMap<string, "dirt" | "water"> {
    return this.terrainTypes;
  }

  public getElevations(): ReadonlyMap<string, number> {
    return this.elevations;
  }

  public getRobotNode(): string {
    return this.robotNode;
  }

  public getDestinationNode(): string {
    return this.destinationNode;
  }

  public setRobotNode(node: string): void {
    this.robotNode = node;
  }

  public setDestinationNode(node: string): void {
    this.destinationNode = node;
  }

  public hasWall(key: string): boolean {
    return this.wallNodes.has(key);
  }

  public getElevation(key: string): number {
    return this.elevations.get(key) ?? 0;
  }

  public getTerrainFactor(key: string): number {
    return this.terrainFactors.get(key) ?? 0;
  }

  public getTerrainType(key: string): "dirt" | "water" | undefined {
    return this.terrainTypes.get(key);
  }

  public isSessionActive(): boolean {
    return this.strokeSession !== null;
  }

  public getActiveStrokeBrush(): BrushMode | "robot" | "destination" | null {
    return this.strokeSession?.brush ?? null;
  }

  public getModifiedCells(): ReadonlySet<string> {
    return this.strokeSession?.modifiedCells ?? new Set();
  }

  public toScenario(extra: {
    rows?: number;
    cols?: number;
    maxTraversableSlope: number;
    initialHeading: Heading;
    showGradients: boolean;
    climbingFactor?: number;
    turnPenalty?: number;
  }): Scenario {
    return {
      rows: extra.rows ?? this.rows,
      cols: extra.cols ?? this.cols,
      robotNode: this.robotNode,
      destinationNode: this.destinationNode,
      wallNodes: this.wallNodes,
      terrainFactors: this.terrainFactors,
      terrainTypes: this.terrainTypes,
      elevations: this.elevations,
      climbingFactor: extra.climbingFactor ?? ENERGY_CONFIG.climbingFactor,
      turnPenalty: extra.turnPenalty ?? ENERGY_CONFIG.turnPenalty,
      maxTraversableSlope: extra.maxTraversableSlope,
      initialHeading: extra.initialHeading,
      showGradients: extra.showGradients,
      robotPhysics: {
        ...VEHICLE_CONFIG,
        maxTraversableSlope: extra.maxTraversableSlope,
      },
    };
  }

  // --- Topology & Layer Operations ---

  public setDimensions(
    cols: number,
    rows: number,
  ): {
    clamped: boolean;
    clampedRobotR: number;
    clampedRobotC: number;
    clampedDestR: number;
    clampedDestC: number;
  } {
    this.cols = cols;
    this.rows = rows;

    const [startR, startC] = parseCoordinates(this.robotNode);
    const clampedRobotR = Math.min(Math.max(0, startR), rows - 1);
    const clampedRobotC = Math.min(Math.max(0, startC), cols - 1);
    const nextRobotNode = `${clampedRobotR}-${clampedRobotC}`;

    const [destR, destC] = parseCoordinates(this.destinationNode);
    const clampedDestR = Math.min(Math.max(0, destR), rows - 1);
    const clampedDestC = Math.min(Math.max(0, destC), cols - 1);
    const nextDestNode = `${clampedDestR}-${clampedDestC}`;

    const clamped = nextRobotNode !== this.robotNode || nextDestNode !== this.destinationNode;
    this.robotNode = nextRobotNode;
    this.destinationNode = nextDestNode;

    return {
      clamped,
      clampedRobotR,
      clampedRobotC,
      clampedDestR,
      clampedDestC,
    };
  }

  public resetNodes(options: {
    rows: number;
    cols: number;
    initialRobotNode?: string | null;
    initialDestinationNode?: string | null;
  }): void {
    const { rows, cols, initialRobotNode, initialDestinationNode } = options;
    this.rows = rows;
    this.cols = cols;
    const defaultRobotCol = Math.floor(cols / 4);
    const defaultDestCol = Math.floor((cols / 4) * 3);
    const defaultRow = Math.floor(rows / 2);

    if (initialRobotNode) {
      const [r, c] = parseCoordinates(initialRobotNode);
      if (r < rows && c < cols) {
        this.robotNode = initialRobotNode;
      } else {
        this.robotNode = `${defaultRow}-${defaultRobotCol}`;
      }
    } else {
      this.robotNode = `${defaultRow}-${defaultRobotCol}`;
    }

    if (initialDestinationNode) {
      const [r, c] = parseCoordinates(initialDestinationNode);
      if (r < rows && c < cols) {
        this.destinationNode = initialDestinationNode;
      } else {
        this.destinationNode = `${defaultRow}-${defaultDestCol}`;
      }
    } else {
      this.destinationNode = `${defaultRow}-${defaultDestCol}`;
    }
  }

  public updateTypeCost(type: "dirt" | "water", newCost: number): boolean {
    let changed = false;
    const next = new Map(this.terrainFactors);
    for (const [k, cellType] of this.terrainTypes.entries()) {
      if (cellType === type && next.get(k) !== newCost) {
        next.set(k, newCost);
        changed = true;
      }
    }
    if (changed) {
      this.terrainFactors = next;
    }
    return changed;
  }

  public updateElevation(newElevation: number): boolean {
    let changed = false;
    const next = new Map(this.elevations);
    for (const [k, elev] of this.elevations.entries()) {
      if (elev > 0 && elev !== newElevation) {
        next.set(k, newElevation);
        changed = true;
      }
    }
    if (changed) {
      this.elevations = next;
    }
    return changed;
  }

  public clearAll(): Set<string> {
    const keysToClean = new Set<string>([
      ...this.wallNodes,
      ...this.terrainFactors.keys(),
      ...this.terrainTypes.keys(),
      ...this.elevations.keys(),
      ...(this.strokeSession ? this.strokeSession.modifiedCells : []),
    ]);

    this.strokeSession = null;
    this.wallNodes = new Set();
    this.terrainFactors = new Map();
    this.terrainTypes = new Map();
    this.elevations = new Map();

    return keysToClean;
  }

  public loadScenario(scenario: Scenario): void {
    this.clearAll();

    this.cols = scenario.cols ?? 25;
    this.rows = scenario.rows ?? 25;
    this.robotNode = scenario.robotNode;
    this.destinationNode = scenario.destinationNode;
    this.wallNodes = new Set(scenario.wallNodes);
    this.terrainFactors = new Map(scenario.terrainFactors);
    this.terrainTypes = new Map(scenario.terrainTypes ?? []);
    this.elevations = new Map(scenario.elevations);
  }

  // --- Transactional Pointer Strokes ---

  public startStroke(key: string, context: PaintContext): StrokeResult {
    const previousSnapshot: TerrainSnapshot = {
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
      return { modified: true, brush: "robot", cellKey: key };
    }

    if (key === this.destinationNode) {
      this.strokeSession = {
        brush: "destination",
        drawValue: null,
        modifiedCells: new Set(),
        previousSnapshot,
      };
      return { modified: true, brush: "destination", cellKey: key };
    }

    let calculatedDrawValue: number | boolean | null = null;

    if (context.activeBrush === "wall") {
      calculatedDrawValue = !this.wallNodes.has(key);
    } else if (context.activeBrush === "dirt") {
      const currentCost = this.terrainFactors.get(key);
      const isCurrentDirt = this.isDirtCell(key);
      calculatedDrawValue =
        isCurrentDirt && currentCost === context.dirtBrushValue ? 0 : context.dirtBrushValue;
    } else if (context.activeBrush === "water") {
      const currentCost = this.terrainFactors.get(key);
      const isCurrentWater = this.isWaterCell(key);
      calculatedDrawValue =
        isCurrentWater && currentCost === context.waterBrushValue ? 0 : context.waterBrushValue;
    } else if (context.activeBrush === "elevation") {
      const current = this.isElevationCell(key) ? (this.elevations.get(key) ?? 0) : 0;
      calculatedDrawValue =
        current === context.elevationBrushValue ? 0 : context.elevationBrushValue;
    }

    this.strokeSession = {
      brush: context.activeBrush,
      drawValue: calculatedDrawValue,
      modifiedCells: new Set(),
      previousSnapshot,
    };

    const applied = this.applyStrokeToCell(key);
    return {
      modified: applied.modified,
      brush: context.activeBrush,
      cellKey: key,
      preview: applied.preview,
    };
  }

  public continueStroke(key: string): StrokeResult {
    if (!this.strokeSession) return { modified: false };

    const { brush } = this.strokeSession;

    if (brush === "robot") {
      if (key !== this.destinationNode && !this.wallNodes.has(key)) {
        if (this.robotNode === key) return { modified: false };
        this.robotNode = key;
        return { modified: true, brush: "robot", cellKey: key };
      }
      return { modified: false };
    }

    if (brush === "destination") {
      if (key !== this.robotNode && !this.wallNodes.has(key)) {
        if (this.destinationNode === key) return { modified: false };
        this.destinationNode = key;
        return { modified: true, brush: "destination", cellKey: key };
      }
      return { modified: false };
    }

    if (key === this.robotNode || key === this.destinationNode) {
      if (brush !== "elevation") {
        return { modified: false };
      }
    }

    if (this.strokeSession.modifiedCells.has(key)) {
      return { modified: true, brush, cellKey: key };
    }

    const applied = this.applyStrokeToCell(key);
    return {
      modified: applied.modified,
      brush,
      cellKey: key,
      preview: applied.preview,
    };
  }

  public commitStroke(): string[] | null {
    if (!this.strokeSession) return null;

    const modified = Array.from(this.strokeSession.modifiedCells);
    this.strokeSession = null;
    return modified;
  }

  public endStroke(): string[] | null {
    return this.commitStroke();
  }

  public abortStroke(): RollbackCell[] | null {
    if (!this.strokeSession) return null;

    const snapshot = this.strokeSession.previousSnapshot;

    this.wallNodes = new Set(snapshot.wallNodes);
    this.terrainFactors = new Map(snapshot.terrainFactors);
    this.terrainTypes = new Map(snapshot.terrainTypes);
    this.elevations = new Map(snapshot.elevations);
    this.robotNode = snapshot.robotNode;
    this.destinationNode = snapshot.destinationNode;

    const rolledBack: RollbackCell[] = [];
    for (const key of this.strokeSession.modifiedCells) {
      rolledBack.push({
        key,
        restoreWall: this.wallNodes.has(key),
      });
    }

    this.strokeSession = null;
    return rolledBack;
  }

  // --- Internal Helpers ---

  private isDirtCell(key: string): boolean {
    if (this.wallNodes.has(key)) return false;
    const type = this.terrainTypes.get(key);
    if (type === "dirt") return true;
    if (!type && this.terrainFactors.get(key) === TERRAIN_CONFIG.types.dirt.cost) {
      return true;
    }
    return false;
  }

  private isWaterCell(key: string): boolean {
    if (this.wallNodes.has(key)) return false;
    const type = this.terrainTypes.get(key);
    if (type === "water") return true;
    if (!type && this.terrainFactors.get(key) === TERRAIN_CONFIG.types.water.cost) {
      return true;
    }
    return false;
  }

  private isElevationCell(key: string): boolean {
    if (this.wallNodes.has(key)) return false;
    return (this.elevations.get(key) ?? 0) > 0;
  }

  private applyStrokeToCell(key: string): { modified: boolean; preview?: CellPreview } {
    if (!this.strokeSession) return { modified: false };

    const { brush, drawValue } = this.strokeSession;

    if (brush === "wall") {
      const isWall = Boolean(drawValue);
      if (!isWall) {
        // Delete mode: only delete if cell is currently a wall
        if (!this.wallNodes.has(key)) {
          return { modified: false };
        }
        const nextWallNodes = new Set(this.wallNodes);
        nextWallNodes.delete(key);
        this.wallNodes = nextWallNodes;
        this.strokeSession.modifiedCells.add(key);
        return {
          modified: true,
          preview: { color: "transparent", isWall: false },
        };
      }

      // Paint mode: paint wall and resolve mutual exclusion
      if (this.wallNodes.has(key)) {
        return { modified: false };
      }
      const nextWallNodes = new Set(this.wallNodes);
      nextWallNodes.add(key);
      this.wallNodes = nextWallNodes;
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
      this.strokeSession.modifiedCells.add(key);
      return {
        modified: true,
        preview: { color: TERRAIN_CONFIG.types.wall.color, isWall: true },
      };
    }

    if (brush === "dirt") {
      const val = Number(drawValue);
      if (val === 0) {
        // Delete mode: only delete if currently dirt
        if (!this.isDirtCell(key)) {
          return { modified: false };
        }
        const nextFactors = new Map(this.terrainFactors);
        const nextTypes = new Map(this.terrainTypes);
        nextFactors.delete(key);
        nextTypes.delete(key);
        this.terrainFactors = nextFactors;
        this.terrainTypes = nextTypes;
        this.strokeSession.modifiedCells.add(key);
        return {
          modified: true,
          preview: { color: "transparent", isWall: false },
        };
      }

      // Paint mode: paint dirt and resolve mutual exclusion
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
      nextFactors.set(key, val);
      nextTypes.set(key, "dirt");
      this.terrainFactors = nextFactors;
      this.terrainTypes = nextTypes;
      this.strokeSession.modifiedCells.add(key);
      return {
        modified: true,
        preview: { color: TERRAIN_CONFIG.types.dirt.color, isWall: false },
      };
    }

    if (brush === "water") {
      const val = Number(drawValue);
      if (val === 0) {
        // Delete mode: only delete if currently water
        if (!this.isWaterCell(key)) {
          return { modified: false };
        }
        const nextFactors = new Map(this.terrainFactors);
        const nextTypes = new Map(this.terrainTypes);
        nextFactors.delete(key);
        nextTypes.delete(key);
        this.terrainFactors = nextFactors;
        this.terrainTypes = nextTypes;
        this.strokeSession.modifiedCells.add(key);
        return {
          modified: true,
          preview: { color: "transparent", isWall: false },
        };
      }

      // Paint mode: paint water and resolve mutual exclusion
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
      nextFactors.set(key, val);
      nextTypes.set(key, "water");
      this.terrainFactors = nextFactors;
      this.terrainTypes = nextTypes;
      this.strokeSession.modifiedCells.add(key);
      return {
        modified: true,
        preview: { color: TERRAIN_CONFIG.types.water.color, isWall: false },
      };
    }

    if (brush === "elevation") {
      const val = Number(drawValue);
      if (val === 0) {
        // Delete mode: only delete if currently elevation
        if (!this.isElevationCell(key)) {
          return { modified: false };
        }
        const nextElevations = new Map(this.elevations);
        nextElevations.delete(key);
        this.elevations = nextElevations;
        this.strokeSession.modifiedCells.add(key);
        return {
          modified: true,
          preview: { color: "transparent", isWall: false },
        };
      }

      // Paint mode: paint elevation and resolve mutual exclusion
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
      nextElevations.set(key, val);
      this.elevations = nextElevations;
      this.strokeSession.modifiedCells.add(key);
      return {
        modified: true,
        preview: { color: TERRAIN_CONFIG.getElevationColor(val), isWall: false },
      };
    }

    return { modified: false };
  }
}
