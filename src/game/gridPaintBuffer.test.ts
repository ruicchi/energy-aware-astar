import { describe, it, expect, vi } from "vitest";
import { GridPaintBuffer, type TerrainStateHolder, type PaintContext } from "./gridPaintBuffer";
import type { SimulationDomAdapter, SimulationDomElement } from "./simulationEngine";
import { TERRAIN_CONFIG } from "../config/simulationConfig";

describe("GridPaintBuffer", () => {
  function createMockDomAdapter() {
    const domStore = new Map<
      string,
      { bg: string; classes: Set<string>; dataset: Record<string, string | undefined> }
    >();

    function getCellElement(key: string): SimulationDomElement {
      if (!domStore.has(key)) {
        domStore.set(key, { bg: "", classes: new Set(), dataset: {} });
      }
      const record = domStore.get(key)!;

      return {
        style: {
          get backgroundColor() {
            return record.bg;
          },
          set backgroundColor(val: string) {
            record.bg = val;
          },
        },
        classList: {
          add(c: string) {
            record.classes.add(c);
          },
          remove(c: string) {
            record.classes.delete(c);
          },
        },
        dataset: record.dataset,
      };
    }

    const clearAllSearchVisuals = vi.fn();
    const setRobotPosition = vi.fn();
    const setRobotHeading = vi.fn();
    const resetRobot = vi.fn();

    const domAdapter: SimulationDomAdapter = {
      getCellElement,
      clearAllSearchVisuals,
      setRobotPosition,
      setRobotHeading,
      resetRobot,
    };

    return { domAdapter, domStore, resetRobot };
  }

  function createInitialState(): TerrainStateHolder {
    return {
      wallNodes: new Set<string>(),
      terrainFactors: new Map<string, number>(),
      terrainTypes: new Map<string, "dirt" | "water">(),
      elevations: new Map<string, number>(),
      robotNode: "0-0",
      destinationNode: "5-5",
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

  it("paints walls and toggles off existing walls", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const buffer = new GridPaintBuffer(domAdapter);
    const state = createInitialState();
    const context = createContext({ activeBrush: "wall" });

    // Start painting wall at 1-1
    buffer.startStroke("1-1", state, context);
    expect(buffer.isSessionActive()).toBe(true);
    expect(buffer.getActiveStrokeBrush()).toBe("wall");
    expect(state.wallNodes.has("1-1")).toBe(true);
    expect(domStore.get("1-1")?.bg).toBe(TERRAIN_CONFIG.types.wall.color);
    expect(domStore.get("1-1")?.classes.has("is-wall")).toBe(true);

    // Continue painting wall at 1-2
    buffer.continueStroke("1-2", state, context);
    expect(state.wallNodes.has("1-2")).toBe(true);

    // Commit end of stroke
    buffer.endStroke();
    expect(buffer.isSessionActive()).toBe(false);
    expect(domStore.get("1-1")?.bg).toBe(""); // Inline preview style cleared

    // Toggle wall off by starting stroke on existing wall 1-1
    buffer.startStroke("1-1", state, context);
    expect(state.wallNodes.has("1-1")).toBe(false);
    expect(domStore.get("1-1")?.classes.has("is-wall")).toBe(false);
    buffer.endStroke();
  });

  it("paints dirt and enforces layer mutual exclusion", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const buffer = new GridPaintBuffer(domAdapter);
    const state = createInitialState();
    state.wallNodes.add("2-2");
    state.elevations.set("2-2", 4);

    const context = createContext({ activeBrush: "dirt", dirtBrushValue: 1.8 });

    buffer.startStroke("2-2", state, context);
    expect(state.terrainFactors.get("2-2")).toBe(1.8);
    expect(state.terrainTypes.get("2-2")).toBe("dirt");
    expect(state.wallNodes.has("2-2")).toBe(false); // Cleared wall
    expect(state.elevations.has("2-2")).toBe(false); // Cleared elevation
    expect(domStore.get("2-2")?.bg).toBe(TERRAIN_CONFIG.types.dirt.color);

    buffer.endStroke();
  });

  it("paints water and enforces layer mutual exclusion", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const buffer = new GridPaintBuffer(domAdapter);
    const state = createInitialState();
    state.wallNodes.add("3-3");

    const context = createContext({ activeBrush: "water", waterBrushValue: 2.5 });

    buffer.startStroke("3-3", state, context);
    expect(state.terrainFactors.get("3-3")).toBe(2.5);
    expect(state.terrainTypes.get("3-3")).toBe("water");
    expect(state.wallNodes.has("3-3")).toBe(false);
    expect(domStore.get("3-3")?.bg).toBe(TERRAIN_CONFIG.types.water.color);

    buffer.endStroke();
  });

  it("paints elevation and enforces layer mutual exclusion", () => {
    const { domAdapter } = createMockDomAdapter();
    const buffer = new GridPaintBuffer(domAdapter);
    const state = createInitialState();
    state.wallNodes.add("4-4");
    state.terrainFactors.set("4-4", 1.5);
    state.terrainTypes.set("4-4", "dirt");

    const context = createContext({ activeBrush: "elevation", elevationBrushValue: 5 });

    buffer.startStroke("4-4", state, context);
    expect(state.elevations.get("4-4")).toBe(5);
    expect(state.wallNodes.has("4-4")).toBe(false);
    expect(state.terrainFactors.has("4-4")).toBe(false);
    expect(state.terrainTypes.has("4-4")).toBe(false);

    buffer.endStroke();
  });

  it("drags robot start node across cells and updates adapter", () => {
    const { domAdapter, resetRobot } = createMockDomAdapter();
    const buffer = new GridPaintBuffer(domAdapter);
    const state = createInitialState();
    const context = createContext();

    // Click on robotNode "0-0"
    buffer.startStroke("0-0", state, context);
    expect(buffer.getActiveStrokeBrush()).toBe("robot");

    // Drag to "0-1"
    const moved = buffer.continueStroke("0-1", state, context);
    expect(moved).toBe(true);
    expect(state.robotNode).toBe("0-1");
    expect(resetRobot).toHaveBeenCalledWith(1, 0, "RIGHT", 24);

    // Cannot drag onto destination node "5-5"
    const movedToDest = buffer.continueStroke("5-5", state, context);
    expect(movedToDest).toBe(false);
    expect(state.robotNode).toBe("0-1");

    buffer.endStroke();
  });

  it("drags destination node across cells", () => {
    const { domAdapter } = createMockDomAdapter();
    const buffer = new GridPaintBuffer(domAdapter);
    const state = createInitialState();
    const context = createContext();

    // Click on destinationNode "5-5"
    buffer.startStroke("5-5", state, context);
    expect(buffer.getActiveStrokeBrush()).toBe("destination");

    // Drag to "4-4"
    const moved = buffer.continueStroke("4-4", state, context);
    expect(moved).toBe(true);
    expect(state.destinationNode).toBe("4-4");

    // Cannot drag onto robotNode "0-0"
    const movedToRobot = buffer.continueStroke("0-0", state, context);
    expect(movedToRobot).toBe(false);
    expect(state.destinationNode).toBe("4-4");

    buffer.endStroke();
  });

  it("aborts active stroke and restores snapshot perfectly", () => {
    const { domAdapter, domStore } = createMockDomAdapter();
    const buffer = new GridPaintBuffer(domAdapter);
    const state = createInitialState();
    state.wallNodes.add("1-1");

    const context = createContext({ activeBrush: "wall" });

    // Start painting wall on 2-2, 2-3
    buffer.startStroke("2-2", state, context);
    buffer.continueStroke("2-3", state, context);
    expect(state.wallNodes.has("2-2")).toBe(true);
    expect(state.wallNodes.has("2-3")).toBe(true);
    expect(domStore.get("2-2")?.classes.has("is-wall")).toBe(true);

    // Abort stroke
    const restored = buffer.abortStroke(state);
    expect(restored).not.toBeNull();
    expect(buffer.isSessionActive()).toBe(false);
    expect(state.wallNodes.has("1-1")).toBe(true);
    expect(state.wallNodes.has("2-2")).toBe(false);
    expect(state.wallNodes.has("2-3")).toBe(false);
    expect(domStore.get("2-2")?.classes.has("is-wall")).toBe(false);
    expect(domStore.get("2-2")?.bg).toBe("");
  });
});
