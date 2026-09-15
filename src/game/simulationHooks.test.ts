import { describe, it, expect } from "vitest";
import {
  shallowEqual,
  computePolylinePoints,
  selectGridCanvas,
  selectSimulationControls,
  selectBrushControls,
} from "./simulationHooks";
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

  it("isolates slope updates: maxTraversableSlope updates brush slice without affecting grid dimensions", () => {
    const engine = new SimulationEngine({ cols: 20, rows: 20 });
    const s1 = engine.getSnapshot();

    const brushSlice1 = {
      activeBrush: s1.activeBrush,
      elevationBrushValue: s1.elevationBrushValue,
      maxTraversableSlope: s1.maxTraversableSlope,
    };
    const gridSlice1 = { cols: s1.cols, rows: s1.rows, cellSize: s1.cellSize };

    engine.setMaxTraversableSlope(45);
    const s2 = engine.getSnapshot();

    const brushSlice2 = {
      activeBrush: s2.activeBrush,
      elevationBrushValue: s2.elevationBrushValue,
      maxTraversableSlope: s2.maxTraversableSlope,
    };
    const gridSlice2 = { cols: s2.cols, rows: s2.rows, cellSize: s2.cellSize };

    expect(shallowEqual(brushSlice1, brushSlice2)).toBe(false);
    expect(brushSlice2.maxTraversableSlope).toBe(45);
    expect(shallowEqual(gridSlice1, gridSlice2)).toBe(true);
  });
});

describe("simulationHooks - computePolylinePoints", () => {
  it("returns an empty string when path is null, undefined, or has fewer than 2 coordinates", () => {
    expect(computePolylinePoints(null, 20)).toBe("");
    expect(computePolylinePoints(undefined, 20)).toBe("");
    expect(computePolylinePoints([], 20)).toBe("");
    expect(computePolylinePoints(["0-0"], 20)).toBe("");
  });

  it("calculates center coordinates for SVG polyline accurately", () => {
    const points = computePolylinePoints(["0-0", "1-2", "3-5"], 20);
    // 0-0: col 0, row 0 -> 0*20+10, 0*20+10 = 10,10
    // 1-2: col 2, row 1 -> 2*20+10, 1*20+10 = 50,30
    // 3-5: col 5, row 3 -> 5*20+10, 3*20+10 = 110,70
    expect(points).toBe("10,10 50,30 110,70");
  });
});

describe("simulationHooks - Unified Grid Canvas Seam", () => {
  it("extracts complete canvas state including wallNodes and backwards-compatible wallNode", () => {
    const engine = new SimulationEngine({ cols: 15, rows: 12, cellSize: 24 });
    const s = engine.getSnapshot();
    const canvas = selectGridCanvas(s);

    expect(canvas.cols).toBe(15);
    expect(canvas.rows).toBe(12);
    expect(canvas.cellSize).toBe(24);
    expect(canvas.wallNodes).toBe(s.wallNodes);
    expect(canvas.wallNode).toBe(s.wallNodes);
    expect(canvas.robotNode).toBe(s.robotNode);
    expect(canvas.destinationNode).toBe(s.destinationNode);
    expect(canvas.robotHeading).toBe(s.robotHeading);
    expect(canvas.isLineVisible).toBe(false);
    expect(canvas.polylinePoints).toBe("");
  });

  it("completely shields GameGrid from re-renders when brush controls or parameters change", () => {
    const engine = new SimulationEngine({ cols: 20, rows: 20 });
    const s1 = engine.getSnapshot();
    const canvas1 = selectGridCanvas(s1);

    // Change various brush settings
    engine.setActiveBrush("dirt");
    engine.setDirtBrushValue(5);
    engine.setWaterBrushValue(8);
    engine.setElevationBrushValue(4);
    engine.setMaxTraversableSlope(35);

    const s2 = engine.getSnapshot();
    const canvas2 = selectGridCanvas(s2);

    // The canvas selector is shallowly identical: 0 re-renders for GameGrid!
    expect(shallowEqual(canvas1, canvas2)).toBe(true);

    // When showGradients is true, maxTraversableSlope changes trigger canvas update
    engine.setShowGradients(true);
    const sGradients1 = engine.getSnapshot();
    const canvasG1 = selectGridCanvas(sGradients1);

    engine.setMaxTraversableSlope(45);
    const sGradients2 = engine.getSnapshot();
    const canvasG2 = selectGridCanvas(sGradients2);

    expect(shallowEqual(canvasG1, canvasG2)).toBe(false);
    expect(canvasG2.maxTraversableSlope).toBe(45);
  });

  it("re-renders canvas when terrain or dimensions change", () => {
    const engine = new SimulationEngine({ cols: 20, rows: 20 });
    const s1 = engine.getSnapshot();
    const canvas1 = selectGridCanvas(s1);

    engine.setActiveBrush("wall");
    engine.startPaint("5-5");
    engine.endPaint();
    const s2 = engine.getSnapshot();
    const canvas2 = selectGridCanvas(s2);

    expect(shallowEqual(canvas1, canvas2)).toBe(false);
    expect(canvas2.wallNodes.has("5-5")).toBe(true);
  });

  it("computes polyline points when a path is visible", () => {
    const engine = new SimulationEngine({ cols: 20, rows: 20 });
    engine.solveInstantly(); // Solves path
    const s = engine.getSnapshot();
    const canvas = selectGridCanvas(s);

    expect(canvas.currentPath).not.toBeNull();
    if (s.isPathVisible && canvas.currentPath && canvas.currentPath.length > 1) {
      expect(canvas.isLineVisible).toBe(true);
      expect(canvas.polylinePoints.length).toBeGreaterThan(0);
      expect(canvas.polylinePoints).toContain(",");
    }
  });
});

describe("simulationHooks - Consolidated Control Seams", () => {
  it("projects simulation control state and responds to algorithm changes without affecting brush slice", () => {
    const engine = new SimulationEngine({ cols: 20, rows: 20 });
    const s1 = engine.getSnapshot();
    const simControls1 = selectSimulationControls(s1);
    const brushControls1 = selectBrushControls(s1);

    expect(simControls1.selectedAlgo).toBe("energyAware");
    expect(simControls1.isEnergyAware).toBe(true);
    expect(brushControls1.activeBrush).toBe("wall");

    // Change algorithm
    engine.setSelectedAlgo("manhattan", false);
    const s2 = engine.getSnapshot();
    const simControls2 = selectSimulationControls(s2);
    const brushControls2 = selectBrushControls(s2);

    expect(shallowEqual(simControls1, simControls2)).toBe(false);
    expect(simControls2.selectedAlgo).toBe("manhattan");
    expect(simControls2.isEnergyAware).toBe(false);

    // Brush slice remains identical
    expect(shallowEqual(brushControls1, brushControls2)).toBe(true);
  });

  it("projects brush controls and responds to brush adjustments without affecting simulation controls", () => {
    const engine = new SimulationEngine({ cols: 20, rows: 20 });
    const s1 = engine.getSnapshot();
    const simControls1 = selectSimulationControls(s1);
    const brushControls1 = selectBrushControls(s1);

    expect(brushControls1.dirtBrushValue).toBe(0.5);

    // Adjust dirt brush value
    engine.setDirtBrushValue(7);
    const s2 = engine.getSnapshot();
    const simControls2 = selectSimulationControls(s2);
    const brushControls2 = selectBrushControls(s2);

    expect(shallowEqual(brushControls1, brushControls2)).toBe(false);
    expect(brushControls2.dirtBrushValue).toBe(7);

    // Simulation controls remain identical
    expect(shallowEqual(simControls1, simControls2)).toBe(true);
  });
});

