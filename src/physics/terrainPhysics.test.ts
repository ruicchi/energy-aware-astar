import { describe, it, expect } from "vitest"
import {
  getStepDistance,
  getHeading,
  getElevationGradient,
  getPosture,
  isStablePosture,
  isTraversableSlope,
  SQRT2,
} from "./terrainPhysics"
import type { Scenario } from "../shared/types"

const createScenario = (overrides: Partial<Scenario> = {}): Scenario => ({
  rows: 10,
  cols: 10,
  robotNode: "0-0",
  destinationNode: "0-5",
  wallNodes: new Set(),
  terrainFactors: new Map(),
  elevations: new Map(),
  climbingFactor: 1.5,
  turnPenalty: 1.0,
  maxTraversableSlope: 45,
  initialHeading: "RIGHT",
  robotPhysics: {
    trackWidth: 0.8,
    wheelBase: 1.2,
    comHeight: 0.6,
    stabilityMargin: 0.05,
  },
  ...overrides,
})

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
  })
})
