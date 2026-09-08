import { describe, it, expect } from "vitest"
import { findPath } from "./engine"
import type { Scenario } from "../../shared/types"
import { VEHICLE_CONFIG, ENERGY_CONFIG, TERRAIN_CONFIG } from "../../config/simulationConfig"

const createTestScenario = (overrides: Partial<Scenario> = {}): Scenario => ({
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
})

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
  })
})
