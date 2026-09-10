import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SimulationEngine,
  type SimulationDomAdapter,
  type SimulationDomElement,
} from "./simulationEngine";
import type { Scenario } from "../shared/types";

describe("SimulationEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

    function clearAllSearchVisuals() {
      for (const record of domStore.values()) {
        delete record.dataset.manhattan;
        delete record.dataset.energy;
        delete record.dataset.path;
      }
    }

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

    return { domAdapter, domStore, setRobotPosition, setRobotHeading, resetRobot };
  };

  it("notifies subscribers and provides immutable snapshots", () => {
    const engine = new SimulationEngine({ cols: 10, rows: 10 });
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);

    engine.setActiveBrush("dirt");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(engine.getSnapshot().activeBrush).toBe("dirt");

    unsubscribe();
    engine.setActiveBrush("water");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(engine.getSnapshot().activeBrush).toBe("water");
  });

  describe("Stroke & Paint Buffer Semantics", () => {
    it("paints walls during stroke and toggles walls off", () => {
      const { domAdapter, domStore } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "0-0",
        initialDestinationNode: "5-5",
        domAdapter,
      });

      engine.setActiveBrush("wall");
      engine.startPaint("1-1");
      expect(domStore.get("1-1")?.bg).toBe("#1a88e2");
      expect(domStore.get("1-1")?.classes.has("is-wall")).toBe(true);

      engine.continuePaint("1-2");
      expect(domStore.get("1-2")?.bg).toBe("#1a88e2");

      engine.endPaint();
      expect(engine.getSnapshot().wallNodes.has("1-1")).toBe(true);
      expect(engine.getSnapshot().wallNodes.has("1-2")).toBe(true);
      // DOM inline preview styling is cleared for React rendering
      expect(domStore.get("1-1")?.bg).toBe("");
      expect(domStore.get("1-2")?.bg).toBe("");

      // Second stroke on 1-1 toggles it off
      engine.startPaint("1-1");
      engine.endPaint();
      expect(engine.getSnapshot().wallNodes.has("1-1")).toBe(false);
      expect(engine.getSnapshot().wallNodes.has("1-2")).toBe(true);
    });

    it("paints configurable dirt and water terrain factors and updates them en masse", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "0-0",
        initialDestinationNode: "5-5",
        domAdapter,
      });

      engine.setDirtBrushValue(2.0);
      engine.setActiveBrush("dirt");
      engine.startPaint("2-1");
      engine.endPaint();

      expect(engine.getSnapshot().terrainFactors.get("2-1")).toBe(2.0);
      expect(engine.getSnapshot().terrainTypes.get("2-1")).toBe("dirt");

      // Changing dirtBrushValue updates existing dirt cells
      engine.setDirtBrushValue(3.5);
      expect(engine.getSnapshot().terrainFactors.get("2-1")).toBe(3.5);

      // Paint water
      engine.setWaterBrushValue(1.5);
      engine.setActiveBrush("water");
      engine.startPaint("2-2");
      engine.endPaint();

      expect(engine.getSnapshot().terrainFactors.get("2-2")).toBe(1.5);
      expect(engine.getSnapshot().terrainTypes.get("2-2")).toBe("water");

      // Changing waterBrushValue updates water cells
      engine.setWaterBrushValue(4.0);
      expect(engine.getSnapshot().terrainFactors.get("2-2")).toBe(4.0);
    });

    it("overwrites a painted wall tile when clicked or dragged over with another brush", () => {
      const { domAdapter, domStore } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "0-0",
        initialDestinationNode: "5-5",
        domAdapter,
      });

      // 1. Paint walls at 1-1 and 1-2
      engine.setActiveBrush("wall");
      engine.startPaint("1-1");
      engine.continuePaint("1-2");
      engine.endPaint();
      expect(engine.getSnapshot().wallNodes.has("1-1")).toBe(true);
      expect(engine.getSnapshot().wallNodes.has("1-2")).toBe(true);

      // 2. Click 1-1 with dirt brush -> overwrites wall with dirt
      engine.setActiveBrush("dirt");
      engine.setDirtBrushValue(2.5);
      engine.startPaint("1-1");
      expect(domStore.get("1-1")?.classes.has("is-wall")).toBe(false);
      engine.endPaint();

      expect(engine.getSnapshot().wallNodes.has("1-1")).toBe(false);
      expect(engine.getSnapshot().terrainFactors.get("1-1")).toBe(2.5);
      expect(engine.getSnapshot().terrainTypes.get("1-1")).toBe("dirt");

      // 3. Drag water brush across 1-2 -> overwrites wall with water
      engine.setActiveBrush("water");
      engine.setWaterBrushValue(3.5);
      engine.startPaint("1-2");
      expect(domStore.get("1-2")?.classes.has("is-wall")).toBe(false);
      engine.endPaint();

      expect(engine.getSnapshot().wallNodes.has("1-2")).toBe(false);
      expect(engine.getSnapshot().terrainFactors.get("1-2")).toBe(3.5);
      expect(engine.getSnapshot().terrainTypes.get("1-2")).toBe("water");

      // 4. Paint a wall again at 1-1 -> overwrites dirt with wall
      engine.setActiveBrush("wall");
      engine.startPaint("1-1");
      engine.endPaint();
      expect(engine.getSnapshot().wallNodes.has("1-1")).toBe(true);
      expect(engine.getSnapshot().terrainFactors.has("1-1")).toBe(false);
      expect(engine.getSnapshot().terrainTypes.has("1-1")).toBe(false);

      // 5. Click 1-1 with elevation brush -> overwrites wall with elevation
      engine.setActiveBrush("elevation");
      engine.setElevationBrushValue(4);
      engine.startPaint("1-1");
      expect(domStore.get("1-1")?.classes.has("is-wall")).toBe(false);
      engine.endPaint();

      expect(engine.getSnapshot().wallNodes.has("1-1")).toBe(false);
      expect(engine.getSnapshot().elevations.get("1-1")).toBe(4);
    });

    it("instantly updates cell visuals to transparent when deleting on mouse drag", () => {
      const { domAdapter, domStore } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "0-0",
        initialDestinationNode: "5-5",
        initialWallNodes: new Set(["1-1", "1-2", "1-3"]),
        domAdapter,
      });

      // Start deleting walls on mouse drag
      engine.setActiveBrush("wall");
      engine.startPaint("1-1");
      expect(domStore.get("1-1")?.bg).toBe("transparent");
      expect(domStore.get("1-1")?.classes.has("is-wall")).toBe(false);

      // Drag over 1-2
      engine.continuePaint("1-2");
      expect(domStore.get("1-2")?.bg).toBe("transparent");
      expect(domStore.get("1-2")?.classes.has("is-wall")).toBe(false);

      // Drag over 1-3
      engine.continuePaint("1-3");
      expect(domStore.get("1-3")?.bg).toBe("transparent");
      expect(domStore.get("1-3")?.classes.has("is-wall")).toBe(false);

      // After endPaint, inline preview styles are reset for React declarative rendering
      engine.endPaint();
      expect(domStore.get("1-1")?.bg).toBe("");
      expect(domStore.get("1-2")?.bg).toBe("");
      expect(domStore.get("1-3")?.bg).toBe("");
      expect(engine.getSnapshot().wallNodes.has("1-1")).toBe(false);
      expect(engine.getSnapshot().wallNodes.has("1-2")).toBe(false);
      expect(engine.getSnapshot().wallNodes.has("1-3")).toBe(false);
    });

    it("moves robot and destination on drag and respects boundaries and walls", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "0-0",
        initialDestinationNode: "5-5",
        initialWallNodes: new Set(["0-2"]),
        domAdapter,
      });

      // Drag robot
      engine.startPaint("0-0");
      engine.continuePaint("0-1");
      // Try to move into wall 0-2
      engine.continuePaint("0-2");
      engine.endPaint();

      expect(engine.getSnapshot().robotNode).toBe("0-1");

      // Drag destination
      engine.startPaint("5-5");
      engine.continuePaint("5-4");
      engine.endPaint();

      expect(engine.getSnapshot().destinationNode).toBe("5-4");
    });

    it("prevents dragging robot onto an unstable elevation slope", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "2-1",
        initialDestinationNode: "5-5",
        initialElevations: new Map([["2-3", 10]]),
        domAdapter,
      });

      engine.startPaint("2-1");
      engine.continuePaint("2-2"); // Unstable due to cliff at 2-3
      engine.endPaint();

      expect(engine.getSnapshot().robotNode).toBe("2-1");
    });

    it("skips painting elevation over robot node if it would cause instability", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "2-2",
        initialDestinationNode: "5-5",
        initialElevations: new Map([["2-3", 10]]),
        domAdapter,
      });

      engine.setElevationBrushValue(10);
      engine.setActiveBrush("elevation");
      engine.startPaint("0-0");
      engine.continuePaint("2-2"); // Robot node near cliff
      engine.endPaint();

      expect(engine.getSnapshot().elevations.get("0-0")).toBe(10);
      expect(engine.getSnapshot().elevations.has("2-2")).toBe(false);
    });

    it("aborts stroke and restores previous snapshot", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "0-0",
        initialDestinationNode: "5-5",
        initialWallNodes: new Set(["1-1"]),
        domAdapter,
      });

      engine.setActiveBrush("wall");
      engine.startPaint("1-2");
      engine.continuePaint("1-3");
      expect(engine.getSnapshot().wallNodes.has("1-2")).toBe(true);

      engine.abortPaint();
      expect(engine.isSessionActive()).toBe(false);
      expect(engine.getSnapshot().wallNodes.has("1-2")).toBe(false);
      expect(engine.getSnapshot().wallNodes.has("1-1")).toBe(true);
    });

    it("clears walls and terrain cleanly", () => {
      const { domAdapter, domStore } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "0-0",
        initialDestinationNode: "5-5",
        initialWallNodes: new Set(["1-1"]),
        initialTerrainFactors: new Map([["2-1", 1.0]]),
        initialElevations: new Map([["3-1", 5]]),
        domAdapter,
      });

      domStore.get("1-1")?.classes.add("is-wall");

      engine.clearWalls();
      expect(engine.getSnapshot().wallNodes.size).toBe(0);
      expect(engine.getSnapshot().terrainFactors.size).toBe(0);
      expect(engine.getSnapshot().elevations.size).toBe(0);
      expect(domStore.get("1-1")?.classes.has("is-wall")).toBe(false);
    });
  });

  describe("Visualization & Search Playback", () => {
    it("runs pathfinding visualization, animates open/closed search nodes, and displays path", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "2-0",
        initialDestinationNode: "2-3",
        domAdapter,
      });

      engine.visualize("manhattan");

      const state1 = engine.getSnapshot();
      expect(state1.isAnimating).toBe(true);
      expect(state1.playbackStatus).toBe("searching");
      expect(state1.currentPath).toEqual(["2-0", "2-1", "2-2", "2-3"]);
      expect(state1.pathMetrics).not.toBeNull();
      expect(state1.pathMetrics?.algorithm).toBe("Manhattan");

      // Advance timers to complete node animation
      vi.runAllTimers();

      const state2 = engine.getSnapshot();
      expect(state2.isAnimating).toBe(false);
      expect(state2.isPathVisible).toBe(true);
      expect(state2.isManhattanFinished).toBe(true);
      expect(state2.playbackStatus).toBe("idle");
    });
  });

  describe("Robot Walking Kinematics", () => {
    it("walks path and updates step and heading", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "2-0",
        initialDestinationNode: "2-2",
        domAdapter,
      });

      engine.visualize("manhattan");
      vi.runAllTimers();

      engine.walk();
      expect(engine.getSnapshot().isWalking).toBe(true);
      expect(engine.getSnapshot().playbackStatus).toBe("walking");

      // Advance through walking steps
      vi.runAllTimers();

      expect(engine.getSnapshot().isWalking).toBe(false);
      expect(engine.getSnapshot().hasFinishedWalking).toBe(true);
      expect(engine.getSnapshot().walkFailure).toBeNull();
    });

    it("detects untraversable slopes during walk and triggers failure", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "2-0",
        initialDestinationNode: "2-3",
        initialElevations: new Map([["2-2", 30]]), // extreme cliff
        domAdapter,
      });

      // Run manhattan which ignores slope in spatial planning
      engine.visualize("manhattan");
      vi.runAllTimers();

      engine.walk();
      vi.runAllTimers();

      const snapshot = engine.getSnapshot();
      expect(snapshot.isWalking).toBe(false);
      expect(snapshot.hasFinishedWalking).toBe(true);
      expect(snapshot.walkFailure).not.toBeNull();
      expect(snapshot.walkFailure?.reason).toBe("ROBOT TIPPED OVER");
    });

    it("invokes direct DOM adapter updates during walk without firing intermediate notifications", () => {
      const { domAdapter, setRobotPosition } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "0-0",
        initialDestinationNode: "0-3",
        domAdapter,
      });

      engine.visualize("manhattan");
      vi.runAllTimers();

      const listener = vi.fn();
      engine.subscribe(listener);

      engine.walk();
      // 1 notification on walk start
      expect(listener).toHaveBeenCalledTimes(1);
      expect(engine.getSnapshot().isWalking).toBe(true);

      // Advance through walking steps
      vi.runAllTimers();

      // Direct DOM position was called for traversal steps
      expect(setRobotPosition).toHaveBeenCalled();

      // 1 additional notification on walk finish, total 2 (no intermediate re-render spam)
      expect(listener).toHaveBeenCalledTimes(2);
      expect(engine.getSnapshot().isWalking).toBe(false);
      expect(engine.getSnapshot().hasFinishedWalking).toBe(true);
    });
  });

  describe("Reset", () => {
    it("clears board, animations, and path metrics completely", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 10,
        rows: 10,
        initialRobotNode: "1-1",
        initialDestinationNode: "1-3",
        initialWallNodes: new Set(["0-0"]),
        domAdapter,
      });

      engine.visualize("energyAware");
      vi.runAllTimers();

      expect(engine.getSnapshot().pathMetrics).not.toBeNull();

      engine.reset();
      const state = engine.getSnapshot();
      expect(state.pathMetrics).toBeNull();
      expect(state.currentPath).toBeNull();
      expect(state.wallNodes.size).toBe(0);
      expect(state.isManhattanFinished).toBe(false);
      expect(state.isEnergyFinished).toBe(false);
      expect(state.playbackStatus).toBe("idle");
    });
  });

  describe("Scenario Loading & Instant Solving", () => {
    it("loads test scenario, locks dimensions, and solves instantly without animation delay", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({
        cols: 40,
        rows: 25,
        domAdapter,
      });

      const testScenario: Scenario = {
        rows: 25,
        cols: 25,
        robotNode: "2-2",
        destinationNode: "10-10",
        initialHeading: "DOWN_RIGHT",
        wallNodes: new Set(["5-5", "5-6", "5-7"]),
        terrainFactors: new Map([["4-4", 2.0]]),
        elevations: new Map([["3-3", 4]]),
        climbingFactor: 1.5,
        turnPenalty: 1.0,
        maxTraversableSlope: 45,
      };

      engine.loadScenario(testScenario, { name: "Test Case", instantSolve: true });

      const snapshot = engine.getSnapshot();
      expect(snapshot.isFixedDimensions).toBe(true);
      expect(snapshot.loadedScenarioName).toBe("Test Case");
      expect(snapshot.rows).toBe(25);
      expect(snapshot.cols).toBe(25);
      expect(snapshot.robotNode).toBe("2-2");
      expect(snapshot.destinationNode).toBe("10-10");
      expect(snapshot.wallNodes.has("5-5")).toBe(true);
      expect(snapshot.terrainFactors.get("4-4")).toBe(2.0);
      expect(snapshot.elevations.get("3-3")).toBe(4);
      expect(snapshot.showGradients).toBe(true);

      // Instant solve verifies path and metrics exist immediately without ticking timers
      expect(snapshot.isAnimating).toBe(false);
      expect(snapshot.isPathVisible).toBe(true);
      expect(snapshot.currentPath).not.toBeNull();
      expect(snapshot.currentPath!.length).toBeGreaterThan(0);
      expect(snapshot.pathMetrics).not.toBeNull();
      expect(snapshot.pathMetrics!.algorithm).toBe("Energy-Aware");
      expect(snapshot.pathMetrics!.isSafe).toBe(true);
    });

    it("immediately re-solves path when switching heuristic on a loaded scenario", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({ cols: 25, rows: 25, domAdapter });

      const testScenario: Scenario = {
        rows: 25,
        cols: 25,
        robotNode: "2-2",
        destinationNode: "5-5",
        wallNodes: new Set(),
        terrainFactors: new Map(),
        elevations: new Map(),
        climbingFactor: 1.5,
        turnPenalty: 1.0,
      };

      engine.loadScenario(testScenario, { instantSolve: true });
      expect(engine.getSnapshot().pathMetrics?.algorithm).toBe("Energy-Aware");

      // Switching heuristic updates path and metrics immediately
      engine.setSelectedAlgo("manhattan");
      const manhattanSnapshot = engine.getSnapshot();
      expect(manhattanSnapshot.selectedAlgo).toBe("manhattan");
      expect(manhattanSnapshot.pathMetrics?.algorithm).toBe("Manhattan");
      expect(manhattanSnapshot.isPathVisible).toBe(true);

      engine.setSelectedAlgo("euclidean");
      const euclideanSnapshot = engine.getSnapshot();
      expect(euclideanSnapshot.selectedAlgo).toBe("euclidean");
      expect(euclideanSnapshot.pathMetrics?.algorithm).toBe("Euclidean");
      expect(euclideanSnapshot.isPathVisible).toBe(true);
    });

    it("resets to freeform viewport mode properly", () => {
      const { domAdapter } = createMockDomAdapter();
      const engine = new SimulationEngine({ cols: 40, rows: 25, domAdapter });

      const testScenario: Scenario = {
        rows: 25,
        cols: 25,
        robotNode: "2-2",
        destinationNode: "5-5",
        wallNodes: new Set(["1-1"]),
        terrainFactors: new Map(),
        elevations: new Map(),
        climbingFactor: 1.5,
        turnPenalty: 1.0,
      };

      engine.loadScenario(testScenario, { instantSolve: true });
      expect(engine.getSnapshot().isFixedDimensions).toBe(true);

      engine.resetToFreeform(50, 30, 28);
      const snapshot = engine.getSnapshot();
      expect(snapshot.isFixedDimensions).toBe(false);
      expect(snapshot.loadedScenarioName).toBeNull();
      expect(snapshot.cols).toBe(50);
      expect(snapshot.rows).toBe(30);
      expect(snapshot.wallNodes.size).toBe(0);
      expect(snapshot.currentPath).toBeNull();
    });
  });
});
