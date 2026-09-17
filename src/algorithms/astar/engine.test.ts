import { describe, it, expect } from "vitest"
import { findPath } from "./index"
import type { Scenario } from "../../shared/types"
import { VEHICLE_CONFIG, ENERGY_CONFIG, TERRAIN_CONFIG } from "../../config/simulationConfig"

function createTestScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    rows: 10,
    cols: 10,
    robotNode: "0-0",
    destinationNode: "0-4",
    wallNodes: new Set(),
    terrainFactors: new Map(),
    elevations: new Map(),
    climbingFactor: ENERGY_CONFIG.climbingFactor,
    turnPenalty: ENERGY_CONFIG.turnPenalty,
    maxTraversableSlope: TERRAIN_CONFIG.defaultMaxTraversableSlope,
    initialHeading: VEHICLE_CONFIG.defaultHeading,
    robotPhysics: VEHICLE_CONFIG,
    ...overrides,
  };
}

describe("Pathfinding Engine", () => {
  describe("Standard A*", () => {
    it("finds the direct straight line path on a flat grid", () => {
      const scenario = createTestScenario({
        robotNode: "2-2",
        destinationNode: "2-5",
      })

      const result = findPath(scenario, { algorithm: "manhattan" })

      expect(result.shortestPath).toEqual(["2-2", "2-3", "2-4", "2-5"])
      expect(result.totalDistance).toBe(3)
      expect(result.visitedNodesInOrder.length).toBeGreaterThan(0)
      expect(result.energyBreakdown).toBeDefined()
    })

    it("navigates around walls", () => {
      const scenario = createTestScenario({
        robotNode: "2-2",
        destinationNode: "2-4",
        wallNodes: new Set(["2-3"]),
      })

      const result = findPath(scenario, { algorithm: "manhattan" })

      expect(result.shortestPath.length).toBeGreaterThan(0)
      expect(result.shortestPath).not.toContain("2-3")
      expect(result.shortestPath[0]).toBe("2-2")
      expect(result.shortestPath[result.shortestPath.length - 1]).toBe("2-4")
    })

    it("returns empty path when goal is completely blocked by walls", () => {
      const scenario = createTestScenario({
        robotNode: "1-1",
        destinationNode: "0-0",
        wallNodes: new Set(["0-1", "1-0"]),
      })

      const result = findPath(scenario, { algorithm: "manhattan" })

      expect(result.shortestPath).toEqual([])
      expect(result.totalDistance).toBe(0)
      expect(result.totalEnergy).toBe(0)
      expect(result.energyBreakdown.nodesExpanded).toBeGreaterThan(0)
      expect(result.energyBreakdown.nodesGenerated).toBeGreaterThan(0)
      expect(result.energyBreakdown.nodesEvaluated).toBe(result.energyBreakdown.nodesExpanded)
    })

    it("evaluates nodes adhering to industry standards (nodesExpanded, nodesGenerated, nodesEvaluated)", () => {
      const scenario = createTestScenario({
        robotNode: "0-0",
        destinationNode: "2-2",
      })

      const result = findPath(scenario, { algorithm: "manhattan" })

      expect(result.energyBreakdown.nodesExpanded).toBeGreaterThan(0)
      expect(result.energyBreakdown.nodesGenerated).toBeGreaterThanOrEqual(result.energyBreakdown.nodesExpanded)
      expect(result.energyBreakdown.nodesEvaluated).toBe(result.energyBreakdown.nodesExpanded)
    })

    it("terminates immediately with zero cost when robot start node equals destination node", () => {
      const scenario = createTestScenario({
        robotNode: "2-2",
        destinationNode: "2-2",
      })

      const result = findPath(scenario, { algorithm: "energyAware" })

      expect(result.shortestPath).toEqual(["2-2"])
      expect(result.totalDistance).toBe(0)
      expect(result.totalEnergy).toBe(0)
      expect(result.energyBreakdown.nodesExpanded).toBe(1)
      expect(result.energyBreakdown.nodesGenerated).toBe(1)
      expect(result.visitedNodesInOrder).toEqual([])
    })

    it("does not generate in-place self-transitions at the current place", () => {
      const scenario = createTestScenario({
        robotNode: "1-1",
        destinationNode: "1-4",
      })

      const result = findPath(scenario, { algorithm: "energyAware" })

      expect(result.shortestPath.length).toBeGreaterThan(1)
      for (let i = 1; i < result.shortestPath.length; i++) {
        expect(result.shortestPath[i]).not.toBe(result.shortestPath[i - 1])
      }
    })

    it("supports euclidean, chebyshev, and octile distance heuristics", () => {
      const scenario = createTestScenario({
        robotNode: "0-0",
        destinationNode: "3-3",
      })

      const euclideanResult = findPath(scenario, { algorithm: "euclidean" })
      const octileResult = findPath(scenario, { algorithm: "octile" })
      const chebyshevResult = findPath(scenario, { algorithm: "chebyshev" })

      expect(euclideanResult.shortestPath[0]).toBe("0-0")
      expect(euclideanResult.shortestPath[euclideanResult.shortestPath.length - 1]).toBe("3-3")
      expect(octileResult.shortestPath[0]).toBe("0-0")
      expect(octileResult.shortestPath[octileResult.shortestPath.length - 1]).toBe("3-3")
      expect(chebyshevResult.shortestPath[0]).toBe("0-0")
      expect(chebyshevResult.shortestPath[chebyshevResult.shortestPath.length - 1]).toBe("3-3")
    })

    it("steers standard heuristics based on initial robot heading", () => {
      const scenarioRight = createTestScenario({
        robotNode: "1-1",
        destinationNode: "2-2",
        initialHeading: "RIGHT",
      });

      const manhattanRight = findPath(scenarioRight, { algorithm: "manhattan" });
      expect(manhattanRight.shortestPath).toEqual(["1-1", "1-2", "2-2"]);

      const scenarioDown = createTestScenario({
        robotNode: "1-1",
        destinationNode: "2-2",
        initialHeading: "DOWN",
      });

      const manhattanDown = findPath(scenarioDown, { algorithm: "manhattan" });
      expect(manhattanDown.shortestPath).toEqual(["1-1", "2-1", "2-2"]);

      const euclideanRight = findPath(scenarioRight, { algorithm: "euclidean" });
      const octileRight = findPath(scenarioRight, { algorithm: "octile" });
      const chebyshevRight = findPath(scenarioRight, { algorithm: "chebyshev" });

      expect(euclideanRight.shortestPath[0]).toBe("1-1");
      expect(euclideanRight.shortestPath[euclideanRight.shortestPath.length - 1]).toBe("2-2");
      expect(octileRight.shortestPath[0]).toBe("1-1");
      expect(octileRight.shortestPath[octileRight.shortestPath.length - 1]).toBe("2-2");
      expect(chebyshevRight.shortestPath[0]).toBe("1-1");
      expect(chebyshevRight.shortestPath[chebyshevRight.shortestPath.length - 1]).toBe("2-2");
    })
  })

  describe("Energy-Aware A*", () => {
    it("finds optimal path factoring in turning orientation", () => {
      const scenario = createTestScenario({
        robotNode: "2-0",
        destinationNode: "2-4",
        initialHeading: "RIGHT",
      })

      const result = findPath(scenario, { algorithm: "energyAware" })

      expect(result.shortestPath).toEqual(["2-0", "2-1", "2-2", "2-3", "2-4"])
      expect(result.totalDistance).toBe(4)
      expect(result.energyBreakdown.turnCost).toBe(0)
    })

    it("routes around heavy terrain (dirt/water) when energy cost is higher", () => {
      const scenario = createTestScenario({
        rows: 5,
        cols: 5,
        robotNode: "1-1",
        destinationNode: "1-3",
        initialHeading: "RIGHT",
        terrainFactors: new Map([
          ["1-2", 50.0],
        ]),
      })

      const result = findPath(scenario, { algorithm: "energyAware" })

      expect(result.shortestPath.length).toBeGreaterThan(0)
      expect(result.shortestPath).not.toContain("1-2")
    })

    it("correctly calculates breakdown for custom dirt and water brush penalties", () => {
      const scenario = createTestScenario({
        rows: 3,
        cols: 5,
        robotNode: "1-0",
        destinationNode: "1-3",
        initialHeading: "RIGHT",
        wallNodes: new Set(["0-1", "0-2", "2-1", "2-2"]),
        terrainFactors: new Map([
          ["1-1", 2.0],
          ["1-2", 3.0],
        ]),
        terrainTypes: new Map([
          ["1-1", "dirt"],
          ["1-2", "water"],
        ]),
      })

      const result = findPath(scenario, { algorithm: "energyAware" })

      expect(result.shortestPath).toEqual(["1-0", "1-1", "1-2", "1-3"])
      expect(result.energyBreakdown.dirtPenalty).toBeGreaterThan(0)
      expect(result.energyBreakdown.waterPenalty).toBeGreaterThan(0)
      expect(result.energyBreakdown.otherTerrainPenalty).toBe(0)
    })

    it("adopts kinematic heading when initialHeading is NONE", () => {
      const scenario = createTestScenario({
        robotNode: "2-2",
        destinationNode: "2-4",
        initialHeading: "NONE",
      })

      const result = findPath(scenario, { algorithm: "energyAware" })

      expect(result.shortestPath).toEqual(["2-2", "2-3", "2-4"])
      expect(result.totalDistance).toBe(2)
      expect(result.energyBreakdown.total).toBeGreaterThan(0)
    })

    it("refuses to traverse untraversable slopes exceeding max slope threshold", () => {
      const scenario = createTestScenario({
        rows: 3,
        cols: 5,
        robotNode: "1-1",
        destinationNode: "1-3",
        maxTraversableSlope: 10,
        elevations: new Map([
          ["1-1", 0],
          ["1-2", 20],
          ["0-2", 20],
          ["2-2", 20],
        ]),
      })

      const result = findPath(scenario, { algorithm: "energyAware" })

      expect(result.shortestPath).toEqual([])
    })

    it("reports no path found when robot start node is on an untraversable elevation gradient", () => {
      const scenario = createTestScenario({
        rows: 5,
        cols: 5,
        robotNode: "2-2",
        destinationNode: "2-4",
        maxTraversableSlope: 25,
        elevations: new Map([
          ["2-2", 0],
          ["2-3", 10],
          ["2-1", 0],
        ]),
      })

      const result = findPath(scenario, { algorithm: "energyAware" })

      expect(result.shortestPath).toEqual([])
    })

    it("reports no path found when destination node is on an untraversable elevation gradient", () => {
      const scenario = createTestScenario({
        rows: 5,
        cols: 5,
        robotNode: "2-0",
        destinationNode: "2-2",
        maxTraversableSlope: 25,
        elevations: new Map([
          ["2-2", 0],
          ["2-3", 10],
          ["2-1", 0],
        ]),
      })

      const result = findPath(scenario, { algorithm: "energyAware" })

      expect(result.shortestPath).toEqual([])
    })
  })

  describe("3D-Aware Standard A*", () => {
    it("routes around impassable steep slopes when use3DStandard is true, unlike 2D standard", () => {
      // Create a scenario where going straight through (2-2) has a vertical cliff (slope > 30 deg),
      // while an alternative flat path around (1-2) is available.
      // Elevation level 5 with ELEVATION_SCALE 0.5 is height 2.5m, step distance 1.0 => slope = atan(2.5/1)*180/pi = 68.2 deg > 30 deg.
      const scenario = createTestScenario({
        rows: 5,
        cols: 5,
        robotNode: "2-1",
        destinationNode: "2-3",
        maxTraversableSlope: 30,
        elevations: new Map([
          ["2-1", 0],
          ["2-2", 5], // 68.2° slope from 2-1 to 2-2
          ["2-3", 0],
          ["1-1", 0],
          ["1-2", 0], // Flat alternative detour
          ["1-3", 0],
        ]),
      });

      // 2D Euclidean standard ignores elevation and walks straight through the cliff (2-2)
      const result2D = findPath(scenario, { algorithm: "euclidean", use3DStandard: false });
      expect(result2D.shortestPath).toContain("2-2");

      // 3D-Aware Euclidean standard prunes the impassable cliff (2-2) and routes around via row 1
      const result3D = findPath(scenario, { algorithm: "euclidean", use3DStandard: true });
      expect(result3D.shortestPath.length).toBeGreaterThan(0);
      expect(result3D.shortestPath).not.toContain("2-2");
      expect(result3D.shortestPath).toContain("1-2");
      expect(result3D.totalDistance).toBeGreaterThan(0);
    });

    it("evaluates all standard 3D heuristics (manhattan, euclidean, octile, chebyshev)", () => {
      const scenario = createTestScenario({
        rows: 6,
        cols: 6,
        robotNode: "0-0",
        destinationNode: "3-3",
        elevations: new Map([
          ["0-0", 0],
          ["1-1", 1],
          ["2-2", 1],
          ["3-3", 1],
        ]),
      });

      const manhattan3D = findPath(scenario, { algorithm: "manhattan", use3DStandard: true });
      const euclidean3D = findPath(scenario, { algorithm: "euclidean", use3DStandard: true });
      const octile3D = findPath(scenario, { algorithm: "octile", use3DStandard: true });
      const chebyshev3D = findPath(scenario, { algorithm: "chebyshev", use3DStandard: true });

      expect(manhattan3D.shortestPath.length).toBeGreaterThan(0);
      expect(manhattan3D.shortestPath[0]).toBe("0-0");
      expect(manhattan3D.shortestPath[manhattan3D.shortestPath.length - 1]).toBe("3-3");

      expect(euclidean3D.shortestPath.length).toBeGreaterThan(0);
      expect(euclidean3D.shortestPath[0]).toBe("0-0");
      expect(euclidean3D.shortestPath[euclidean3D.shortestPath.length - 1]).toBe("3-3");

      expect(octile3D.shortestPath.length).toBeGreaterThan(0);
      expect(octile3D.shortestPath[0]).toBe("0-0");
      expect(octile3D.shortestPath[octile3D.shortestPath.length - 1]).toBe("3-3");

      expect(chebyshev3D.shortestPath.length).toBeGreaterThan(0);
      expect(chebyshev3D.shortestPath[0]).toBe("0-0");
      expect(chebyshev3D.shortestPath[chebyshev3D.shortestPath.length - 1]).toBe("3-3");

      // In 3D mode, totalDistance incorporates spatial elevation changes
      expect(euclidean3D.totalDistance).toBeGreaterThan(0);
    });
  });
});
