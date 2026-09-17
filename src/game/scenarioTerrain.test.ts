import { describe, it, expect } from "vitest";
import { ScenarioTerrain, type PaintContext } from "./scenarioTerrain";

describe("ScenarioTerrain (Deep Terrain Model)", () => {
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

  it("paints walls and toggles off existing walls with pure stroke descriptors", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
    });
    const context = createContext({ activeBrush: "wall" });

    // Start painting wall at 1-1
    const startResult = terrain.startStroke("1-1", context);
    expect(terrain.isSessionActive()).toBe(true);
    expect(terrain.getActiveStrokeBrush()).toBe("wall");
    expect(terrain.hasWall("1-1")).toBe(true);
    expect(terrain.getSnapshot().wallNodes.has("1-1")).toBe(true);
    expect(startResult.modified).toBe(true);
    expect(startResult.mutation).toEqual({
      key: "1-1",
      layer: "wall",
      value: true,
    });

    // Continue painting wall at 1-2
    const continueResult = terrain.continueStroke("1-2");
    expect(continueResult.modified).toBe(true);
    expect(terrain.hasWall("1-2")).toBe(true);

    // Commit end of stroke - returns modified cell keys for external visual cleanup
    const modified = terrain.commitStroke();
    expect(terrain.isSessionActive()).toBe(false);
    expect(modified).toEqual(["1-1", "1-2"]);

    // Toggle wall off by starting stroke on existing wall 1-1
    const toggleResult = terrain.startStroke("1-1", context);
    expect(terrain.hasWall("1-1")).toBe(false);
    expect(toggleResult.modified).toBe(true);
    expect(toggleResult.mutation).toEqual({
      key: "1-1",
      layer: "wall",
      value: false,
    });

    const toggleModified = terrain.commitStroke();
    expect(toggleModified).toEqual(["1-1"]);
  });

  it("paints dirt and enforces layer mutual exclusion", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["2-2"]),
      initialElevations: new Map([["2-2", 4]]),
    });

    const context = createContext({ activeBrush: "dirt", dirtBrushValue: 1.8 });

    const result = terrain.startStroke("2-2", context);
    expect(result.modified).toBe(true);
    expect(result.mutation).toEqual({ key: "2-2", layer: "dirt", value: 1.8 });

    expect(terrain.getTerrainFactor("2-2")).toBe(1.8);
    expect(terrain.getTerrainType("2-2")).toBe("dirt");
    expect(terrain.hasWall("2-2")).toBe(false); // Cleared wall
    expect(terrain.getElevation("2-2")).toBe(0); // Cleared elevation

    terrain.commitStroke();
  });

  it("paints water and enforces layer mutual exclusion", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["3-3"]),
    });

    const context = createContext({
      activeBrush: "water",
      waterBrushValue: 2.5,
    });

    const result = terrain.startStroke("3-3", context);
    expect(result.modified).toBe(true);
    expect(result.mutation).toEqual({ key: "3-3", layer: "water", value: 2.5 });

    expect(terrain.getTerrainFactor("3-3")).toBe(2.5);
    expect(terrain.getTerrainType("3-3")).toBe("water");
    expect(terrain.hasWall("3-3")).toBe(false);

    terrain.commitStroke();
  });

  it("paints elevation and enforces layer mutual exclusion", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["4-4"]),
      initialTerrainFactors: new Map([["4-4", 2.0]]),
      initialTerrainTypes: new Map([["4-4", "dirt"]]),
    });

    const context = createContext({
      activeBrush: "elevation",
      elevationBrushValue: 5,
    });

    const result = terrain.startStroke("4-4", context);
    expect(result.modified).toBe(true);
    expect(result.mutation).toEqual({
      key: "4-4",
      layer: "elevation",
      value: 5,
    });

    expect(terrain.getElevation("4-4")).toBe(5);
    expect(terrain.hasWall("4-4")).toBe(false);
    expect(terrain.getTerrainFactor("4-4")).toBe(0);
    expect(terrain.getTerrainType("4-4")).toBeUndefined();

    terrain.commitStroke();
  });

  it("drags robot start node across cells producing robot stroke descriptors", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
    });
    const context = createContext({ robotHeading: "UP", cellSize: 30 });

    // Click on robotNode "0-0"
    const startResult = terrain.startStroke("0-0", context);
    expect(terrain.getActiveStrokeBrush()).toBe("robot");
    expect(startResult.modified).toBe(true);
    expect(startResult.brush).toBe("robot");
    expect(startResult.cellKey).toBe("0-0");

    // Drag to "0-1"
    const moveResult = terrain.continueStroke("0-1");
    expect(moveResult.modified).toBe(true);
    expect(moveResult.brush).toBe("robot");
    expect(moveResult.cellKey).toBe("0-1");
    expect(terrain.getRobotNode()).toBe("0-1");

    // Cannot drag onto destination node
    const invalidMove = terrain.continueStroke("5-5");
    expect(invalidMove.modified).toBe(false);
    expect(terrain.getRobotNode()).toBe("0-1");

    terrain.commitStroke();
    expect(terrain.isSessionActive()).toBe(false);
  });

  it("drags destination node across cells", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
    });
    const context = createContext();

    // Click on destinationNode "5-5"
    const startResult = terrain.startStroke("5-5", context);
    expect(terrain.getActiveStrokeBrush()).toBe("destination");
    expect(startResult.modified).toBe(true);

    // Drag to "4-4"
    const moveResult = terrain.continueStroke("4-4");
    expect(moveResult.modified).toBe(true);
    expect(moveResult.brush).toBe("destination");
    expect(moveResult.cellKey).toBe("4-4");
    expect(terrain.getDestinationNode()).toBe("4-4");

    // Cannot drag onto robot node
    const invalidMove = terrain.continueStroke("0-0");
    expect(invalidMove.modified).toBe(false);
    expect(terrain.getDestinationNode()).toBe("4-4");

    terrain.commitStroke();
  });

  it("allows dragging robot and destination nodes onto untraversable elevation gradients", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialElevations: new Map([["1-2", 20]]),
    });
    const context = createContext({ robotHeading: "UP", cellSize: 30 });

    // Drag robot onto untraversable gradient cell 1-1
    terrain.startStroke("0-0", context);
    const robotMoved = terrain.continueStroke("1-1");
    expect(robotMoved.modified).toBe(true);
    expect(terrain.getRobotNode()).toBe("1-1");
    terrain.commitStroke();

    // Drag destination onto untraversable gradient cell 1-1 (move robot to 0-0 first)
    terrain.startStroke("1-1", context);
    terrain.continueStroke("0-0");
    terrain.commitStroke();

    terrain.startStroke("5-5", context);
    const destMoved = terrain.continueStroke("1-1");
    expect(destMoved.modified).toBe(true);
    expect(terrain.getDestinationNode()).toBe("1-1");
    terrain.commitStroke();
  });

  it("allows painting elevation directly over robot and destination nodes even if untraversable", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "1-1",
      initialDestinationNode: "3-3",
      initialElevations: new Map([
        ["1-2", 20],
        ["3-4", 20],
      ]),
    });

    const elevContext = createContext({
      activeBrush: "elevation",
      elevationBrushValue: 15,
    });

    // Start painting from 0-0 and continue over robot node 1-1
    terrain.startStroke("0-0", elevContext);
    const paintedOverRobot = terrain.continueStroke("1-1");
    expect(paintedOverRobot.modified).toBe(true);
    expect(terrain.getElevation("1-1")).toBe(15);

    // Continue over destination node 3-3
    const paintedOverDest = terrain.continueStroke("3-3");
    expect(paintedOverDest.modified).toBe(true);
    expect(terrain.getElevation("3-3")).toBe(15);
    terrain.commitStroke();

    // Wall brush still cannot overwrite robot or destination
    const wallContext = createContext({ activeBrush: "wall" });
    terrain.startStroke("0-0", wallContext);
    expect(terrain.continueStroke("1-1").modified).toBe(false);
    expect(terrain.hasWall("1-1")).toBe(false);
    expect(terrain.continueStroke("3-3").modified).toBe(false);
    expect(terrain.hasWall("3-3")).toBe(false);
    terrain.commitStroke();
  });

  it("aborts active stroke and restores snapshot perfectly", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
    });
    const context = createContext({ activeBrush: "wall" });

    terrain.startStroke("2-2", context);
    terrain.continueStroke("2-3");
    expect(terrain.hasWall("2-2")).toBe(true);
    expect(terrain.hasWall("2-3")).toBe(true);

    // Abort - returns rollback cell descriptors for visual clearance
    const rolledBack = terrain.abortStroke();
    expect(terrain.isSessionActive()).toBe(false);
    expect(terrain.hasWall("2-2")).toBe(false);
    expect(terrain.hasWall("2-3")).toBe(false);
    expect(rolledBack).toEqual(["2-2", "2-3"]);
  });

  it("deletes dirt during drag stroke and returns domain mutation descriptor", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialTerrainFactors: new Map([
        ["2-2", 1.5],
        ["2-3", 1.5],
      ]),
      initialTerrainTypes: new Map([
        ["2-2", "dirt"],
        ["2-3", "dirt"],
      ]),
    });

    const context = createContext({ activeBrush: "dirt", dirtBrushValue: 1.5 });

    // Click on 2-2 to delete dirt
    const startResult = terrain.startStroke("2-2", context);
    expect(terrain.getTerrainFactor("2-2")).toBe(0);
    expect(terrain.getTerrainType("2-2")).toBeUndefined();
    expect(startResult.modified).toBe(true);
    expect(startResult.mutation).toEqual({
      key: "2-2",
      layer: "dirt",
      value: 0,
    });

    // Drag to 2-3 to delete it too
    const moveResult = terrain.continueStroke("2-3");
    expect(terrain.getTerrainFactor("2-3")).toBe(0);
    expect(moveResult.modified).toBe(true);
    expect(moveResult.mutation).toEqual({
      key: "2-3",
      layer: "dirt",
      value: 0,
    });

    const modified = terrain.commitStroke();
    expect(modified).toEqual(["2-2", "2-3"]);
  });

  it("deletes water and elevation during drag stroke with domain mutation descriptor", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialTerrainFactors: new Map([["3-1", 2.0]]),
      initialTerrainTypes: new Map([["3-1", "water"]]),
      initialElevations: new Map([["3-2", 4]]),
    });

    const waterContext = createContext({
      activeBrush: "water",
      waterBrushValue: 2.0,
    });
    const elevContext = createContext({
      activeBrush: "elevation",
      elevationBrushValue: 4,
    });

    const waterResult = terrain.startStroke("3-1", waterContext);
    expect(terrain.getTerrainFactor("3-1")).toBe(0);
    expect(terrain.getTerrainType("3-1")).toBeUndefined();
    expect(waterResult.modified).toBe(true);
    expect(waterResult.mutation).toEqual({
      key: "3-1",
      layer: "water",
      value: 0,
    });
    terrain.commitStroke();

    const elevResult = terrain.startStroke("3-2", elevContext);
    expect(terrain.getElevation("3-2")).toBe(0);
    expect(elevResult.modified).toBe(true);
    expect(elevResult.mutation).toEqual({
      key: "3-2",
      layer: "elevation",
      value: 0,
    });
    terrain.commitStroke();
  });

  it("only deletes walls when wall brush is in delete mode, leaving dirt/water/elevation untouched", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["1-1"]),
      initialTerrainFactors: new Map([
        ["1-2", 1.5],
        ["1-3", 2.0],
      ]),
      initialTerrainTypes: new Map([
        ["1-2", "dirt"],
        ["1-3", "water"],
      ]),
      initialElevations: new Map([["1-4", 4]]),
    });

    const context = createContext({ activeBrush: "wall" });

    // Start deleting on wall 1-1
    const startResult = terrain.startStroke("1-1", context);
    expect(terrain.hasWall("1-1")).toBe(false);
    expect(startResult.modified).toBe(true);
    expect(startResult.mutation).toEqual({
      key: "1-1",
      layer: "wall",
      value: false,
    });

    // Dragging over dirt, water, elevation should NOT modify or delete them
    const dragDirt = terrain.continueStroke("1-2");
    expect(dragDirt.modified).toBe(false);
    expect(terrain.getTerrainType("1-2")).toBe("dirt");

    const dragWater = terrain.continueStroke("1-3");
    expect(dragWater.modified).toBe(false);
    expect(terrain.getTerrainType("1-3")).toBe("water");

    const dragElev = terrain.continueStroke("1-4");
    expect(dragElev.modified).toBe(false);
    expect(terrain.getElevation("1-4")).toBe(4);

    terrain.commitStroke();
  });

  it("only deletes dirt when dirt brush is in delete mode, leaving walls/water/elevation untouched", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["2-2"]),
      initialTerrainFactors: new Map([
        ["2-1", 1.5],
        ["2-3", 2.0],
      ]),
      initialTerrainTypes: new Map([
        ["2-1", "dirt"],
        ["2-3", "water"],
      ]),
      initialElevations: new Map([["2-4", 4]]),
    });

    const context = createContext({ activeBrush: "dirt", dirtBrushValue: 1.5 });

    // Start deleting on dirt 2-1
    const startResult = terrain.startStroke("2-1", context);
    expect(terrain.getTerrainFactor("2-1")).toBe(0);
    expect(terrain.getTerrainType("2-1")).toBeUndefined();
    expect(startResult.modified).toBe(true);
    expect(startResult.mutation).toEqual({
      key: "2-1",
      layer: "dirt",
      value: 0,
    });

    // Dragging over wall, water, elevation should NOT modify them
    const dragWall = terrain.continueStroke("2-2");
    expect(dragWall.modified).toBe(false);
    expect(terrain.hasWall("2-2")).toBe(true);

    const dragWater = terrain.continueStroke("2-3");
    expect(dragWater.modified).toBe(false);
    expect(terrain.getTerrainType("2-3")).toBe("water");

    const dragElev = terrain.continueStroke("2-4");
    expect(dragElev.modified).toBe(false);
    expect(terrain.getElevation("2-4")).toBe(4);

    terrain.commitStroke();
  });

  it("supports layer-level operations: updateTypeCost, clearAll, loadScenario, setDimensions", () => {
    const terrain = new ScenarioTerrain({
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
    const cleared = terrain.clearAll();
    expect(cleared.has("1-1")).toBe(true);
    expect(cleared.has("1-2")).toBe(true);
    expect(cleared.has("1-3")).toBe(true);
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

  it("preserves already painted tiles when dragging from an unpainted tile", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["1-2"]),
      initialTerrainFactors: new Map([["1-3", 1.5]]),
      initialTerrainTypes: new Map([["1-3", "dirt"]]),
      initialElevations: new Map([["1-4", 10]]),
    });

    const wallContext = createContext({ activeBrush: "wall" });

    // 1-1 is unpainted. Start wall stroke on 1-1.
    expect(terrain.isPaintedCell("1-1")).toBe(false);
    const startResult = terrain.startStroke("1-1", wallContext);
    expect(startResult.modified).toBe(true);
    expect(terrain.hasWall("1-1")).toBe(true);

    // Drag over 1-2 (existing wall) -> skipped and preserved
    const dragWall = terrain.continueStroke("1-2");
    expect(dragWall.modified).toBe(false);
    expect(terrain.hasWall("1-2")).toBe(true);

    // Drag over 1-3 (existing dirt) -> skipped and preserved, not deleted or overwritten
    const dragDirt = terrain.continueStroke("1-3");
    expect(dragDirt.modified).toBe(false);
    expect(terrain.getTerrainType("1-3")).toBe("dirt");
    expect(terrain.getTerrainFactor("1-3")).toBe(1.5);
    expect(terrain.hasWall("1-3")).toBe(false);

    // Drag over 1-4 (existing elevation) -> skipped and preserved, not deleted
    const dragElev = terrain.continueStroke("1-4");
    expect(dragElev.modified).toBe(false);
    expect(terrain.getElevation("1-4")).toBe(10);
    expect(terrain.hasWall("1-4")).toBe(false);

    // Drag over 1-5 (unpainted) -> successfully painted with wall
    const dragUnpainted = terrain.continueStroke("1-5");
    expect(dragUnpainted.modified).toBe(true);
    expect(terrain.hasWall("1-5")).toBe(true);

    const committed = terrain.commitStroke();
    // Only 1-1 and 1-5 were modified by the stroke
    expect(committed).toEqual(["1-1", "1-5"]);
  });

  it("preserves walls and elevations when dragging dirt brush from an unpainted tile", () => {
    const terrain = new ScenarioTerrain({
      initialRobotNode: "0-0",
      initialDestinationNode: "5-5",
      initialWallNodes: new Set(["2-2"]),
      initialElevations: new Map([["2-3", 15]]),
    });

    const dirtContext = createContext({
      activeBrush: "dirt",
      dirtBrushValue: 2.0,
    });

    // 2-1 is unpainted. Start dirt stroke on 2-1.
    const startResult = terrain.startStroke("2-1", dirtContext);
    expect(startResult.modified).toBe(true);
    expect(terrain.getTerrainType("2-1")).toBe("dirt");

    // Drag over wall at 2-2 -> skipped and preserved
    const dragWall = terrain.continueStroke("2-2");
    expect(dragWall.modified).toBe(false);
    expect(terrain.hasWall("2-2")).toBe(true);
    expect(terrain.getTerrainType("2-2")).toBeUndefined();

    // Drag over elevation at 2-3 -> skipped and preserved
    const dragElev = terrain.continueStroke("2-3");
    expect(dragElev.modified).toBe(false);
    expect(terrain.getElevation("2-3")).toBe(15);
    expect(terrain.getTerrainType("2-3")).toBeUndefined();

    const committed = terrain.commitStroke();
    expect(committed).toEqual(["2-1"]);
  });
});
