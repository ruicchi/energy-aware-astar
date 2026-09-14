import { describe, it, expect } from "vitest"
import {
  getStepDistance,
  getHeading,
  getElevationGradient,
  computeGradientField,
  getPosture,
  isStablePosture,
  isTraversableSlope,
  evaluatePathSafety,
  getElevationSlopeDegrees,
  getElevationFromSlopeDegrees,
  SQRT2,
} from "./terrainPhysics"
import type { Scenario } from "../shared/types"
import { VEHICLE_CONFIG, ENERGY_CONFIG, TERRAIN_CONFIG } from "../config/simulationConfig"

function createScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    rows: 10,
    cols: 10,
    robotNode: "0-0",
    destinationNode: "0-5",
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

describe("Terrain Physics", () => {
  describe("Kinematics & Direction", () => {
    it("returns correct step distance for cardinal vs diagonal moves", () => {
      expect(getStepDistance("RIGHT")).toBe(1.0)
      expect(getStepDistance("UP")).toBe(1.0)
      expect(getStepDistance("UP_RIGHT")).toBe(SQRT2)
      expect(getStepDistance("DOWN_LEFT")).toBe(SQRT2)
    })

    it("resolves heading between coordinates and string keys", () => {
      expect(getHeading({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe("RIGHT")
      expect(getHeading("2-2", "1-1")).toBe("UP_LEFT")
      expect(getHeading("5-5", "6-5")).toBe("DOWN")
      expect(getHeading("3-3", "3-3")).toBe("NONE")
    })
  })

  describe("Elevation Gradients", () => {
    it("reports zero gradient on flat terrain", () => {
      const elevations = new Map<string, number>()
      const gradient = getElevationGradient(5, 5, elevations)

      expect(gradient.magnitude).toBe(0)
      expect(gradient.angle).toBe(0)
      expect(gradient.isUnstable).toBe(false)
    })

    it("calculates directional gradient and flags instability on extreme cliffs", () => {
      const elevations = new Map<string, number>([
        ["5-6", 20],
        ["4-6", 20],
        ["6-6", 20],
      ])

      const gradient = getElevationGradient(5, 5, elevations)

      expect(gradient.zx).toBeGreaterThan(0)
      expect(gradient.magnitude).toBeGreaterThan(1.0)
      expect(gradient.isUnstable).toBe(true)
    })

    it("precomputes gradient field for non-empty elevations and ignores empty elevations", () => {
      const emptyElevations = new Map<string, number>()
      expect(computeGradientField(10, 10, emptyElevations).size).toBe(0)

      const elevations = new Map<string, number>([
        ["5-6", 20],
        ["4-6", 20],
        ["6-6", 20],
      ])
      const field = computeGradientField(10, 10, elevations)
      expect(field.size).toBeGreaterThan(0)
      expect(field.get("5-5")?.magnitude).toBeGreaterThan(1.0)
      expect(field.get("5-5")?.isUnstable).toBe(true)
    })

    it("dynamically evaluates instability when maxTraversableSlope changes", () => {
      // Nominal 30° elevation tile
      const slope30Elev = getElevationFromSlopeDegrees(30)
      const elevations = new Map<string, number>([["5-5", slope30Elev]])

      // When max slope is 30°, the 30° tile is stable
      const stableAt30 = getElevationGradient(5, 5, elevations, 30)
      expect(stableAt30.isUnstable).toBe(false)
      expect(Math.atan(stableAt30.magnitude) * (180 / Math.PI)).toBeCloseTo(30, 1)

      // When max slope is reduced to 25°, the 30° tile becomes unstable
      const unstableAt25 = getElevationGradient(5, 5, elevations, 25)
      expect(unstableAt25.isUnstable).toBe(true)

      // When max slope is increased to 45°, it remains stable
      const stableAt45 = getElevationGradient(5, 5, elevations, 45)
      expect(stableAt45.isUnstable).toBe(false)
    })
  })

  describe("Vehicle Posture & Santos Stability", () => {
    it("reports zero roll and pitch on flat terrain", () => {
      const elevations = new Map<string, number>()
      const posture = getPosture(5, 5, "RIGHT", elevations)

      expect(posture.roll).toBe(0)
      expect(posture.pitch).toBe(0)
    })

    it("projects pitch when driving straight uphill and roll when driving sideways across a slope", () => {
      // Uniform slope rising to the East (col + 1 is higher)
      const elevations = new Map<string, number>([
        ["4-6", 4],
        ["5-6", 4],
        ["6-6", 4],
        ["4-4", -4],
        ["5-4", -4],
        ["6-4", -4],
      ])

      // Driving East into the slope: pitch up, zero roll
      const uphill = getPosture(5, 5, "RIGHT", elevations)
      expect(uphill.pitch).toBeGreaterThan(0.1)
      expect(Math.abs(uphill.roll)).toBeLessThan(0.01)

      // Driving South across the slope: roll sideways, zero pitch
      const sideSlope = getPosture(5, 5, "DOWN", elevations)
      expect(Math.abs(sideSlope.roll)).toBeGreaterThan(0.1)
      expect(Math.abs(sideSlope.pitch)).toBeLessThan(0.01)
    })

    it("detects instability when side-slope causes CoM projection to breach support polygon", () => {
      // Moderate slope to the right causing tip-over when heading DOWN (narrow trackWidth) but stable when heading RIGHT (longer wheelBase)
      const elevations = new Map<string, number>([
        ["4-6", 1.4],
        ["5-6", 1.4],
        ["6-6", 1.4],
      ])
      const scenario = createScenario({ elevations })

      const stableDrivingUphill = isStablePosture(5, 5, "RIGHT", scenario)
      const unstableSideSlope = isStablePosture(5, 5, "DOWN", scenario)

      expect(stableDrivingUphill).toBe(true)
      expect(unstableSideSlope).toBe(false)
    })

    it("enforces slope traversability cutoffs", () => {
      const elevations = new Map<string, number>([
        ["5-5", 0],
        ["5-6", 20], // steep hill
      ])
      const scenario = createScenario({ elevations, maxTraversableSlope: 20 })

      const isTraversable = isTraversableSlope(
        { row: 5, col: 5 },
        { row: 5, col: 6, heading: "RIGHT" },
        scenario,
      )

      expect(isTraversable).toBe(false)
    })

    it("detects untraversable departure when current position has an unstable elevation gradient", () => {
      // 5-5 is next to a steep cliff at 5-4, making 5-5 unstable
      const elevations = new Map<string, number>([
        ["5-4", 20],
        ["5-5", 0],
        ["5-6", 0],
      ])
      const scenario = createScenario({ elevations, maxTraversableSlope: 20 })

      // Even though moving from 5-5 to 5-6 has slope 0, departing an unstable cell is blocked
      const isTraversable = isTraversableSlope(
        { row: 5, col: 5 },
        { row: 5, col: 6, heading: "RIGHT" },
        scenario,
      )

      expect(isTraversable).toBe(false)
    })

    it("evaluates path as unsafe when the start node itself has an unstable gradient", () => {
      const elevations = new Map<string, number>([
        ["1-2", 20],
        ["1-1", 0],
        ["1-0", 0],
      ])
      const scenario = createScenario({ elevations, maxTraversableSlope: 20 })

      const safety = evaluatePathSafety(["1-1", "1-0"], scenario)
      expect(safety.isSafe).toBe(false)
      expect(safety.failureReason).toBe("UNSTABLE_ELEVATION_GRADIENT")
      expect(safety.failureStep).toBe(0)
    })

    it("calculates nominal elevation slope angle in degrees", () => {
      // With elevationScale = 0.5 and step = 1.0:
      // level 1: atan(0.5) * 180 / PI ≈ 26.565°
      // level 2: atan(1.0) * 180 / PI = 45.0°
      expect(getElevationSlopeDegrees(0)).toBeCloseTo(0, 1)
      expect(getElevationSlopeDegrees(1)).toBeCloseTo(26.6, 1)
      expect(getElevationSlopeDegrees(2)).toBeCloseTo(45.0, 1)
    })

    it("calculates elevation height from target slope angle in degrees", () => {
      expect(getElevationFromSlopeDegrees(0)).toBe(0)
      expect(getElevationFromSlopeDegrees(45)).toBeCloseTo(2.0, 2)
      expect(getElevationSlopeDegrees(getElevationFromSlopeDegrees(5))).toBeCloseTo(5.0, 1)
      expect(getElevationSlopeDegrees(getElevationFromSlopeDegrees(30))).toBeCloseTo(30.0, 1)
      expect(getElevationSlopeDegrees(getElevationFromSlopeDegrees(60))).toBeCloseTo(60.0, 1)
      expect(getElevationSlopeDegrees(getElevationFromSlopeDegrees(90))).toBeCloseTo(90.0, 1)
    })
  })
})
