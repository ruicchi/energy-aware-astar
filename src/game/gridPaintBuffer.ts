import type { BrushMode, Heading } from "../shared/types";
import { TERRAIN_CONFIG } from "../config/simulationConfig";
import { getElevationGradient } from "../physics/terrainPhysics";
import type { SimulationDomAdapter } from "./simulationEngine";

export interface TerrainStateHolder {
  wallNodes: Set<string>;
  terrainFactors: Map<string, number>;
  terrainTypes: Map<string, "dirt" | "water">;
  elevations: Map<string, number>;
  robotNode: string;
  destinationNode: string;
}

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
  robotHeading: Heading;
  cellSize: number;
}

export interface ActiveStrokeSession {
  brush: BrushMode | "robot" | "destination";
  drawValue: number | boolean | null;
  modifiedCells: Set<string>;
  previousSnapshot: TerrainSnapshot;
}

function parseCoordinates(key: string): [number, number] {
  const parts = key.split("-");
  return [Number(parts[0]), Number(parts[1])];
}

/**
 * The deep GridPaintBuffer module.
 * Encapsulates transient pointer drawing sessions, temporary DOM feedback styling,
 * layer mutual-exclusion, and atomic rollback semantics across grid layers.
 */
export class GridPaintBuffer {
  private strokeSession: ActiveStrokeSession | null = null;
  private domAdapter: SimulationDomAdapter;

  constructor(domAdapter: SimulationDomAdapter) {
    this.domAdapter = domAdapter;
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

  public startStroke(
    key: string,
    target: TerrainStateHolder,
    context: PaintContext,
  ): boolean {
    const previousSnapshot: TerrainSnapshot = {
      wallNodes: new Set(target.wallNodes),
      terrainFactors: new Map(target.terrainFactors),
      terrainTypes: new Map(target.terrainTypes),
      elevations: new Map(target.elevations),
      robotNode: target.robotNode,
      destinationNode: target.destinationNode,
    };

    if (key === target.robotNode) {
      this.strokeSession = {
        brush: "robot",
        drawValue: null,
        modifiedCells: new Set(),
        previousSnapshot,
      };
      return true;
    }

    if (key === target.destinationNode) {
      this.strokeSession = {
        brush: "destination",
        drawValue: null,
        modifiedCells: new Set(),
        previousSnapshot,
      };
      return true;
    }

    let calculatedDrawValue: number | boolean | null = null;

    if (context.activeBrush === "wall") {
      calculatedDrawValue = !target.wallNodes.has(key);
    } else if (context.activeBrush === "dirt") {
      const currentType = target.terrainTypes.get(key);
      const currentCost = target.terrainFactors.get(key);
      const isCurrentDirt =
        !target.wallNodes.has(key) &&
        (currentType === "dirt" ||
          (!currentType && currentCost === TERRAIN_CONFIG.types.dirt.cost));
      calculatedDrawValue =
        isCurrentDirt && currentCost === context.dirtBrushValue ? 0 : context.dirtBrushValue;
    } else if (context.activeBrush === "water") {
      const currentType = target.terrainTypes.get(key);
      const currentCost = target.terrainFactors.get(key);
      const isCurrentWater =
        !target.wallNodes.has(key) &&
        (currentType === "water" ||
          (!currentType && currentCost === TERRAIN_CONFIG.types.water.cost));
      calculatedDrawValue =
        isCurrentWater && currentCost === context.waterBrushValue ? 0 : context.waterBrushValue;
    } else if (context.activeBrush === "elevation") {
      const current = target.wallNodes.has(key) ? 0 : (target.elevations.get(key) ?? 0);
      calculatedDrawValue =
        current === context.elevationBrushValue ? 0 : context.elevationBrushValue;
    }

    this.strokeSession = {
      brush: context.activeBrush,
      drawValue: calculatedDrawValue,
      modifiedCells: new Set(),
      previousSnapshot,
    };

    this.applyStrokeToCell(key, target);
    return true;
  }

  public continueStroke(
    key: string,
    target: TerrainStateHolder,
    context: PaintContext,
  ): boolean {
    if (!this.strokeSession) return false;

    const { brush } = this.strokeSession;

    if (brush === "robot") {
      if (key !== target.destinationNode && !target.wallNodes.has(key)) {
        if (target.robotNode === key) return false;
        const [r, c] = parseCoordinates(key);
        if (!getElevationGradient(r, c, target.elevations).isUnstable) {
          target.robotNode = key;
          this.domAdapter.resetRobot(c, r, context.robotHeading, context.cellSize);
          return true;
        }
      }
      return false;
    }

    if (brush === "destination") {
      if (key !== target.robotNode && !target.wallNodes.has(key)) {
        if (target.destinationNode === key) return false;
        const [r, c] = parseCoordinates(key);
        if (!getElevationGradient(r, c, target.elevations).isUnstable) {
          target.destinationNode = key;
          return true;
        }
      }
      return false;
    }

    if (key === target.robotNode || key === target.destinationNode) {
      if (brush === "elevation") {
        const testElevations = new Map(target.elevations);
        testElevations.set(key, this.strokeSession.drawValue as number);
        const [r, c] = parseCoordinates(key);
        if (getElevationGradient(r, c, testElevations).isUnstable) {
          return false;
        }
      } else {
        return false;
      }
    }

    this.applyStrokeToCell(key, target);
    return true;
  }

  public endStroke(): boolean {
    if (!this.strokeSession) return false;

    // Clear inline preview styles so React declarative state styling takes over
    for (const key of this.strokeSession.modifiedCells) {
      const element = this.domAdapter.getCellElement(key);
      if (element) {
        element.style.backgroundColor = "";
      }
    }

    this.strokeSession = null;
    return true;
  }

  public abortStroke(target: TerrainStateHolder): TerrainSnapshot | null {
    if (!this.strokeSession) return null;

    const snapshot = this.strokeSession.previousSnapshot;

    target.wallNodes = new Set(snapshot.wallNodes);
    target.terrainFactors = new Map(snapshot.terrainFactors);
    target.terrainTypes = new Map(snapshot.terrainTypes);
    target.elevations = new Map(snapshot.elevations);
    target.robotNode = snapshot.robotNode;
    target.destinationNode = snapshot.destinationNode;

    for (const key of this.strokeSession.modifiedCells) {
      const element = this.domAdapter.getCellElement(key);
      if (element) {
        element.style.backgroundColor = "";
        element.classList.remove("is-wall");
      }
    }

    this.strokeSession = null;
    return snapshot;
  }

  private applyStrokeToCell(key: string, target: TerrainStateHolder): void {
    if (!this.strokeSession) return;

    const { brush, drawValue } = this.strokeSession;

    if (brush === "wall") {
      const isWall = Boolean(drawValue);
      const nextWallNodes = new Set(target.wallNodes);
      if (isWall) {
        nextWallNodes.add(key);
        if (target.terrainFactors.has(key) || target.terrainTypes.has(key)) {
          const nextFactors = new Map(target.terrainFactors);
          const nextTypes = new Map(target.terrainTypes);
          nextFactors.delete(key);
          nextTypes.delete(key);
          target.terrainFactors = nextFactors;
          target.terrainTypes = nextTypes;
        }
        if (target.elevations.has(key)) {
          const nextElevations = new Map(target.elevations);
          nextElevations.delete(key);
          target.elevations = nextElevations;
        }
      } else {
        nextWallNodes.delete(key);
      }
      target.wallNodes = nextWallNodes;
      this.strokeSession.modifiedCells.add(key);
      this.applyVisual(key, "wall", isWall);
    } else if (brush === "dirt") {
      const val = Number(drawValue);
      const nextFactors = new Map(target.terrainFactors);
      const nextTypes = new Map(target.terrainTypes);
      if (target.wallNodes.has(key)) {
        const nextWallNodes = new Set(target.wallNodes);
        nextWallNodes.delete(key);
        target.wallNodes = nextWallNodes;
      }
      if (target.elevations.has(key)) {
        const nextElevations = new Map(target.elevations);
        nextElevations.delete(key);
        target.elevations = nextElevations;
      }
      if (val === 0) {
        nextFactors.delete(key);
        nextTypes.delete(key);
      } else {
        nextFactors.set(key, val);
        nextTypes.set(key, "dirt");
      }
      target.terrainFactors = nextFactors;
      target.terrainTypes = nextTypes;
      this.strokeSession.modifiedCells.add(key);
      this.applyVisual(key, "dirt", val);
    } else if (brush === "water") {
      const val = Number(drawValue);
      const nextFactors = new Map(target.terrainFactors);
      const nextTypes = new Map(target.terrainTypes);
      if (target.wallNodes.has(key)) {
        const nextWallNodes = new Set(target.wallNodes);
        nextWallNodes.delete(key);
        target.wallNodes = nextWallNodes;
      }
      if (target.elevations.has(key)) {
        const nextElevations = new Map(target.elevations);
        nextElevations.delete(key);
        target.elevations = nextElevations;
      }
      if (val === 0) {
        nextFactors.delete(key);
        nextTypes.delete(key);
      } else {
        nextFactors.set(key, val);
        nextTypes.set(key, "water");
      }
      target.terrainFactors = nextFactors;
      target.terrainTypes = nextTypes;
      this.strokeSession.modifiedCells.add(key);
      this.applyVisual(key, "water", val);
    } else if (brush === "elevation") {
      const val = Number(drawValue);
      const nextElevations = new Map(target.elevations);
      if (target.wallNodes.has(key)) {
        const nextWallNodes = new Set(target.wallNodes);
        nextWallNodes.delete(key);
        target.wallNodes = nextWallNodes;
      }
      if (target.terrainFactors.has(key) || target.terrainTypes.has(key)) {
        const nextFactors = new Map(target.terrainFactors);
        const nextTypes = new Map(target.terrainTypes);
        nextFactors.delete(key);
        nextTypes.delete(key);
        target.terrainFactors = nextFactors;
        target.terrainTypes = nextTypes;
      }
      if (val === 0) {
        nextElevations.delete(key);
      } else {
        nextElevations.set(key, val);
      }
      target.elevations = nextElevations;
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
        element.style.backgroundColor = "transparent";
      }
    } else if (mode === "dirt") {
      element.classList.remove("is-wall");
      if (value) {
        element.style.backgroundColor = TERRAIN_CONFIG.types.dirt.color;
      } else {
        element.style.backgroundColor = "transparent";
      }
    } else if (mode === "water") {
      element.classList.remove("is-wall");
      if (value) {
        element.style.backgroundColor = TERRAIN_CONFIG.types.water.color;
      } else {
        element.style.backgroundColor = "transparent";
      }
    } else if (mode === "elevation") {
      element.classList.remove("is-wall");
      if (value) {
        element.style.backgroundColor = TERRAIN_CONFIG.getElevationColor(Number(value));
      } else {
        element.style.backgroundColor = "transparent";
      }
    }
  }
}
