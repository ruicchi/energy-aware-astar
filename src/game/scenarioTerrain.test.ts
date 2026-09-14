import { describe, it, expect, vi } from "vitest";
import { ScenarioTerrain, type PaintContext } from "./scenarioTerrain";
import { GridPaintBuffer } from "./gridPaintBuffer";
import {
  MemoryVisualizer,
  type SimulationVisualizer,
} from "./simulationVisualizer";
import { TERRAIN_CONFIG } from "../config/simulationConfig";

describe("ScenarioTerrain (Deep Terrain Model)", () => {
  function createMockDomAdapter() {
    const visualizer = new MemoryVisualizer();
    const resetRobot = vi.spyOn(visualizer, "resetRobot");

    const domStore = {
      get(key: string) {
        const p = visualizer.previews.get(key);
        if (!p) return undefined;
        return {
          bg: p.color,
          classes: {
            has: (c: string) => (c === "is-wall" ? Boolean(p.isWall) : false),
          },
        };
      },
    };

    return {
      visualizer,
      domAdapter: visualizer as SimulationVisualizer,
      domStore,
      resetRobot,
    };
  }

  function createContext(overrides: Partial<PaintContext> = {}): PaintContext {
    return {
      activeBrush: "wall",
      elevationBrushValue: 3,
      dirtBrushValue: 1.5,
      waterBrushValue: 2.0,
      robotHeading: "RIGHT",
      cellSize: 24,
      ...overrides,
    };
  }

  it("exports ScenarioTerrain as GridPaintBuffer alias for backward compatibility", () => {
    expect(GridPaintBuffer).toBe(ScenarioTerrain);
  });

  it("paints walls and toggles off existing walls", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
    });
    const context = createContext({ activeBrush: "wall" });

    // Start painting wall at 1-1
    terrain.startStroke("1-1", context);
    expect(terrain.isSessionActive()).toBe(true);
    expect(terrain.getActiveStrokeBrush()).toBe("wall");
    expect(terrain.hasWall("1-1")).toBe(true);
    expect(terrain.getSnapshot().wallNodes.has("1-1")).toBe(true);
    expect(domStore.get("1-1")?.bg).toBe(TERRAIN_CONFIG.types.wall.color);
    expect(domStore.get("1-1")?.classes.has("is-wall")).toBe(true);

    // Continue painting wall at 1-2
    terrain.continueStroke("1-2", context);
    expect(terrain.hasWall("1-2")).toBe(true);

    // Commit end of stroke
    terrain.commitStroke();
    expect(terrain.isSessionActive()).toBe(false);
    expect(domStore.get("1-1")?.bg).toBe(""); // Inline preview style cleared

    // Toggle wall off by starting stroke on existing wall 1-1
    terrain.startStroke("1-1", context);
    expect(terrain.hasWall("1-1")).toBe(false);
    expect(domStore.get("1-1")?.classes.has("is-wall")).toBe(false);
    expect(domStore.get("1-1")?.bg).toBe("transparent");
    terrain.commitStroke();
    expect(domStore.get("1-1")?.bg).toBe("");
  });

  it("paints dirt and enforces layer mutual exclusion", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["2-2"]),
      initialElevations: new Map([["2-2", 4]]),
    });

    const context = createContext({ activeBrush: "dirt", dirtBrushValue: 1.8 });

    terrain.startStroke("2-2", context);
    expect(terrain.getTerrainFactor("2-2")).toBe(1.8);
    expect(terrain.getTerrainType("2-2")).toBe("dirt");
    expect(terrain.hasWall("2-2")).toBe(false); // Cleared wall
    expect(terrain.getElevation("2-2")).toBe(0); // Cleared elevation
    expect(domStore.get("2-2")?.bg).toBe(TERRAIN_CONFIG.types.dirt.color);

    terrain.commitStroke();
  });

  it("paints water and enforces layer mutual exclusion", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["3-3"]),
    });

    const context = createContext({ activeBrush: "water", waterBrushValue: 2.5 });

    terrain.startStroke("3-3", context);
    expect(terrain.getTerrainFactor("3-3")).toBe(2.5);
    expect(terrain.getTerrainType("3-3")).toBe("water");
    expect(terrain.hasWall("3-3")).toBe(false);
    expect(domStore.get("3-3")?.bg).toBe(TERRAIN_CONFIG.types.water.color);

    terrain.commitStroke();
  });

  it("paints elevation and enforces layer mutual exclusion", () => {
    const { domAdapter } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["4-4"]),
      initialTerrainFactors: new Map([["4-4", 2.0]]),
      initialTerrainTypes: new Map([["4-4", "dirt"]]),
    });

    const context = createContext({ activeBrush: "elevation", elevationBrushValue: 5 });

    terrain.startStroke("4-4", context);
    expect(terrain.getElevation("4-4")).toBe(5);
    expect(terrain.hasWall("4-4")).toBe(false);
    expect(terrain.getTerrainFactor("4-4")).toBe(0);
    expect(terrain.getTerrainType("4-4")).toBeUndefined();

    terrain.commitStroke();
  });

  it("drags robot start node across cells and updates adapter", () => {
    const { domAdapter, resetRobot } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
    });
    const context = createContext({ robotHeading: "UP", cellSize: 30 });

    // Click on robotNode "0-0"
    terrain.startStroke("0-0", context);
    expect(terrain.getActiveStrokeBrush()).toBe("robot");

    // Drag to "0-1"
    const moved = terrain.continueStroke("0-1", context);
    expect(moved).toBe(true);
    expect(terrain.getRobotNode()).toBe("0-1");
    expect(resetRobot).toHaveBeenCalledWith(1, 0, "UP", 30);

    // Cannot drag onto destination node
    const invalidMove = terrain.continueStroke("5-5", context);
    expect(invalidMove).toBe(false);
    expect(terrain.getRobotNode()).toBe("0-1");

    terrain.commitStroke();
    expect(terrain.isSessionActive()).toBe(false);
  });

  it("drags destination node across cells", () => {
    const { domAdapter } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
    });
    const context = createContext();

    // Click on destinationNode "5-5"
    terrain.startStroke("5-5", context);
    expect(terrain.getActiveStrokeBrush()).toBe("destination");

    // Drag to "4-4"
    const moved = terrain.continueStroke("4-4", context);
    expect(moved).toBe(true);
    expect(terrain.getDestinationNode()).toBe("4-4");

    // Cannot drag onto robot node
    const invalidMove = terrain.continueStroke("0-0", context);
    expect(invalidMove).toBe(false);
    expect(terrain.getDestinationNode()).toBe("4-4");

    terrain.commitStroke();
  });

  it("aborts active stroke and restores snapshot perfectly", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
    });
    const context = createContext({ activeBrush: "wall" });

    terrain.startStroke("2-2", context);
    terrain.continueStroke("2-3", context);
    expect(terrain.hasWall("2-2")).toBe(true);
    expect(terrain.hasWall("2-3")).toBe(true);
    expect(domStore.get("2-2")?.classes.has("is-wall")).toBe(true);

    // Abort
    terrain.abortStroke();
    expect(terrain.isSessionActive()).toBe(false);
    expect(terrain.hasWall("2-2")).toBe(false);
    expect(terrain.hasWall("2-3")).toBe(false);
    expect(domStore.get("2-2")?.classes.has("is-wall")).toBe(false);
    expect(domStore.get("2-2")?.bg).toBe("");
  });

  it("deletes dirt during drag stroke and instantly shows transparent background", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialTerrainFactors: new Map([["2-2", 1.5], ["2-3", 1.5]]),
      initialTerrainTypes: new Map([["2-2", "dirt"], ["2-3", "dirt"]]),
    });

    const context = createContext({ activeBrush: "dirt", dirtBrushValue: 1.5 });

    // Click on 2-2 to delete dirt
    terrain.startStroke("2-2", context);
    expect(terrain.getTerrainFactor("2-2")).toBe(0);
    expect(terrain.getTerrainType("2-2")).toBeUndefined();
    expect(domStore.get("2-2")?.bg).toBe("transparent");

    // Drag to 2-3 to delete it too
    terrain.continueStroke("2-3", context);
    expect(terrain.getTerrainFactor("2-3")).toBe(0);
    expect(domStore.get("2-3")?.bg).toBe("transparent");

    terrain.commitStroke();
    expect(domStore.get("2-2")?.bg).toBe("");
    expect(domStore.get("2-3")?.bg).toBe("");
  });

  it("deletes water and elevation during drag stroke with instant transparent background", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialTerrainFactors: new Map([["3-1", 2.0]]),
      initialTerrainTypes: new Map([["3-1", "water"]]),
      initialElevations: new Map([["3-2", 4]]),
    });

    const waterContext = createContext({ activeBrush: "water", waterBrushValue: 2.0 });
    const elevContext = createContext({ activeBrush: "elevation", elevationBrushValue: 4 });

    terrain.startStroke("3-1", waterContext);
    expect(terrain.getTerrainFactor("3-1")).toBe(0);
    expect(terrain.getTerrainType("3-1")).toBeUndefined();
    expect(domStore.get("3-1")?.bg).toBe("transparent");
    terrain.commitStroke();

    terrain.startStroke("3-2", elevContext);
    expect(terrain.getElevation("3-2")).toBe(0);
    expect(domStore.get("3-2")?.bg).toBe("transparent");
    terrain.commitStroke();
  });

  it("only deletes walls when wall brush is in delete mode, leaving dirt/water/elevation untouched", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["1-1"]),
      initialTerrainFactors: new Map([["1-2", 1.5], ["1-3", 2.0]]),
      initialTerrainTypes: new Map([["1-2", "dirt"], ["1-3", "water"]]),
      initialElevations: new Map([["1-4", 4]]),
    });

    const context = createContext({ activeBrush: "wall" });

    // Start deleting on wall 1-1
    terrain.startStroke("1-1", context);
    expect(terrain.hasWall("1-1")).toBe(false);
    expect(domStore.get("1-1")?.bg).toBe("transparent");

    // Dragging over dirt, water, elevation should NOT modify or delete them
    const dragDirt = terrain.continueStroke("1-2", context);
    expect(dragDirt).toBe(false);
    expect(terrain.getTerrainType("1-2")).toBe("dirt");

    const dragWater = terrain.continueStroke("1-3", context);
    expect(dragWater).toBe(false);
    expect(terrain.getTerrainType("1-3")).toBe("water");

    const dragElev = terrain.continueStroke("1-4", context);
    expect(dragElev).toBe(false);
    expect(terrain.getElevation("1-4")).toBe(4);

    terrain.commitStroke();
  });

  it("only deletes dirt when dirt brush is in delete mode, leaving walls/water/elevation untouched", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["2-2"]),
      initialTerrainFactors: new Map([["2-1", 1.5], ["2-3", 2.0]]),
      initialTerrainTypes: new Map([["2-1", "dirt"], ["2-3", "water"]]),
      initialElevations: new Map([["2-4", 4]]),
    });

    const context = createContext({ activeBrush: "dirt", dirtBrushValue: 1.5 });

    // Start deleting on dirt 2-1
    terrain.startStroke("2-1", context);
    expect(terrain.getTerrainFactor("2-1")).toBe(0);
    expect(terrain.getTerrainType("2-1")).toBeUndefined();
    expect(domStore.get("2-1")?.bg).toBe("transparent");

    // Dragging over wall, water, elevation should NOT modify them
    const dragWall = terrain.continueStroke("2-2", context);
    expect(dragWall).toBe(false);
    expect(terrain.hasWall("2-2")).toBe(true);

    const dragWater = terrain.continueStroke("2-3", context);
    expect(dragWater).toBe(false);
    expect(terrain.getTerrainType("2-3")).toBe("water");

    const dragElev = terrain.continueStroke("2-4", context);
    expect(dragElev).toBe(false);
    expect(terrain.getElevation("2-4")).toBe(4);

    terrain.commitStroke();
  });

  it("supports layer-level operations: updateTypeCost, clearAll, loadScenario, setDimensions", () => {
    const { domAdapter } = createMockDomAdapter();
    const terrain = new ScenarioTerrain({
      domAdapter,
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["1-1"]),
      initialTerrainFactors: new Map([["1-2", 1.5]]),
      initialTerrainTypes: new Map([["1-2", "dirt"]]),
      initialElevations: new Map([["1-3", 3]]),
    });

    // Update dirt cost
    terrain.updateTypeCost("dirt", 2.5);
    expect(terrain.getTerrainFactor("1-2")).toBe(2.5);

    // Update elevation height
    terrain.updateElevation(4.5);
    expect(terrain.getElevation("1-3")).toBe(4.5);

    // Dimension clamping
    const clampResult = terrain.setDimensions(4, 4);
    expect(clampResult.clamped).toBe(true);
    expect(terrain.getDestinationNode()).toBe("3-3"); // Clamped from 5-5 to 3-3

    // Clear all
    terrain.clearAll();
    expect(terrain.hasWall("1-1")).toBe(false);
    expect(terrain.getTerrainFactor("1-2")).toBe(0);
    expect(terrain.getElevation("1-3")).toBe(0);

    // Load scenario
    terrain.loadScenario({
      rows: 10,
      cols: 10,
      robotNode: "1-1",
      destinationNode: "8-8",
      wallNodes: new Set(["2-2"]),
      terrainFactors: new Map([["3-3", 3.0]]),
      terrainTypes: new Map([["3-3", "water"]]),
      elevations: new Map([["4-4", 2]]),
      maxTraversableSlope: 25,
      initialHeading: "DOWN",
      showGradients: true,
    });
    expect(terrain.getRobotNode()).toBe("1-1");
    expect(terrain.getDestinationNode()).toBe("8-8");
    expect(terrain.hasWall("2-2")).toBe(true);
    expect(terrain.getTerrainFactor("3-3")).toBe(3.0);
    expect(terrain.getElevation("4-4")).toBe(2);
  });
});
