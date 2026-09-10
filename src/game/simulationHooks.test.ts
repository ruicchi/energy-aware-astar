import { describe, it, expect } from "vitest";
import { shallowEqual } from "./simulationHooks";
import { SimulationEngine } from "./simulationEngine";

describe("simulationHooks - shallowEqual", () => {
  it("returns true for identical primitives", () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual("a", "a")).toBe(true);
    expect(shallowEqual(true, true)).toBe(true);
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(undefined, undefined)).toBe(true);
  });

  it("returns false for different primitives", () => {
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual("a", "b")).toBe(false);
    expect(shallowEqual(true, false)).toBe(false);
    expect(shallowEqual(null, undefined)).toBe(false);
  });

  it("returns true for shallowly equal objects", () => {
    const objA = { cols: 25, rows: 25, activeBrush: "wall" };
    const objB = { cols: 25, rows: 25, activeBrush: "wall" };
    expect(shallowEqual(objA, objB)).toBe(true);
  });

  it("returns false for objects with different values", () => {
    const objA = { cols: 25, rows: 25, activeBrush: "wall" };
    const objB = { cols: 25, rows: 25, activeBrush: "dirt" };
    expect(shallowEqual(objA, objB)).toBe(false);
  });

  it("returns false for objects with different keys or key lengths", () => {
    const objA = { cols: 25, rows: 25 };
    const objB = { cols: 25, rows: 25, extra: true };
    expect(shallowEqual(objA, objB)).toBe(false);
    expect(shallowEqual(objB, objA)).toBe(false);
  });

  it("handles null and non-object inputs safely", () => {
    expect(shallowEqual({ a: 1 }, null)).toBe(false);
    expect(shallowEqual(null, { a: 1 })).toBe(false);
    expect(shallowEqual({ a: 1 }, 42 as unknown as object)).toBe(false);
  });
});

describe("simulationHooks - Sliced Selectors & Re-render Isolation", () => {
  it("isolates brush updates: brush slice changes while grid dimensions and scenario remain identical", () => {
    const engine = new SimulationEngine({ cols: 20, rows: 20 });
    const s1 = engine.getSnapshot();

    // Select slices
    const gridSlice1 = { cols: s1.cols, rows: s1.rows, cellSize: s1.cellSize, isFixedDimensions: s1.isFixedDimensions };
    const brushSlice1 = { activeBrush: s1.activeBrush, dirtBrushValue: s1.dirtBrushValue };
    const scenarioSlice1 = { isFixedDimensions: s1.isFixedDimensions, loadedScenarioName: s1.loadedScenarioName };

    // Mutate brush setting
    engine.setActiveBrush("dirt");
    const s2 = engine.getSnapshot();

    const gridSlice2 = { cols: s2.cols, rows: s2.rows, cellSize: s2.cellSize, isFixedDimensions: s2.isFixedDimensions };
    const brushSlice2 = { activeBrush: s2.activeBrush, dirtBrushValue: s2.dirtBrushValue };
    const scenarioSlice2 = { isFixedDimensions: s2.isFixedDimensions, loadedScenarioName: s2.loadedScenarioName };

    // Brush slice changed: triggers re-render for brush panel
    expect(shallowEqual(brushSlice1, brushSlice2)).toBe(false);
    expect(brushSlice2.activeBrush).toBe("dirt");

    // Grid and Scenario slices are shallowly identical: completely shields grid & scenario from re-renders!
    expect(shallowEqual(gridSlice1, gridSlice2)).toBe(true);
    expect(shallowEqual(scenarioSlice1, scenarioSlice2)).toBe(true);
  });

  it("isolates dimension updates: grid dimensions change while brush slice remains identical", () => {
    const engine = new SimulationEngine({ cols: 20, rows: 20 });
    const s1 = engine.getSnapshot();

    const gridSlice1 = { cols: s1.cols, rows: s1.rows, cellSize: s1.cellSize, isFixedDimensions: s1.isFixedDimensions };
    const brushSlice1 = { activeBrush: s1.activeBrush, dirtBrushValue: s1.dirtBrushValue };

    // Mutate viewport dimensions
    engine.setDimensions(30, 25, 20);
    const s2 = engine.getSnapshot();

    const gridSlice2 = { cols: s2.cols, rows: s2.rows, cellSize: s2.cellSize, isFixedDimensions: s2.isFixedDimensions };
    const brushSlice2 = { activeBrush: s2.activeBrush, dirtBrushValue: s2.dirtBrushValue };

    expect(shallowEqual(gridSlice1, gridSlice2)).toBe(false);
    expect(gridSlice2.cols).toBe(30);

    // Brush controls do not re-render
    expect(shallowEqual(brushSlice1, brushSlice2)).toBe(true);
  });

  it("isolates search telemetry: algorithm selection updates telemetry slice without affecting terrain maps", () => {
    const engine = new SimulationEngine({ cols: 20, rows: 20 });
    const s1 = engine.getSnapshot();

    const telemetrySlice1 = { selectedAlgo: s1.selectedAlgo, isPathVisible: s1.isPathVisible };
    const terrainSlice1 = { wallNodes: s1.wallNodes, elevations: s1.elevations };

    engine.setSelectedAlgo("manhattan", false);
    const s2 = engine.getSnapshot();

    const telemetrySlice2 = { selectedAlgo: s2.selectedAlgo, isPathVisible: s2.isPathVisible };
    const terrainSlice2 = { wallNodes: s2.wallNodes, elevations: s2.elevations };

    expect(shallowEqual(telemetrySlice1, telemetrySlice2)).toBe(false);
    expect(telemetrySlice2.selectedAlgo).toBe("manhattan");

    // Terrain grid cells do not re-render
    expect(shallowEqual(terrainSlice1, terrainSlice2)).toBe(true);
  });
});
