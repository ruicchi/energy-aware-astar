import { describe, it, expect } from "vitest"
import { GridPaintBuffer, type GridDomElement } from "./gridPaintBuffer"

describe("GridPaintBuffer", () => {
  const createMockElementProvider = () => {
    const domStore = new Map<string, { bg: string, classes: Set<string> }>()

    const elementProvider = (key: string): GridDomElement => {
      if (!domStore.has(key)) {
        domStore.set(key, { bg: "", classes: new Set() })
      }
      const record = domStore.get(key)!

      return {
        style: {
          get backgroundColor() {
            return record.bg
          },
          set backgroundColor(val: string) {
            record.bg = val
          },
        },
        classList: {
          add(c: string) {
            record.classes.add(c)
          },
          remove(c: string) {
            record.classes.delete(c)
          },
        },
      }
    }

    return { elementProvider, domStore }
  }

  it("paints walls during a stroke and cleans up DOM preview on commit", () => {
    const { elementProvider, domStore } = createMockElementProvider()
    const buffer = new GridPaintBuffer(
      { robotNode: "0-0", destinationNode: "5-5" },
      elementProvider,
    )

    buffer.startStroke("1-1", "wall", 1)
    expect(domStore.get("1-1")?.bg).toBe("#1a88e2")
    expect(domStore.get("1-1")?.classes.has("is-wall")).toBe(true)

    buffer.continueStroke("1-2")
    expect(domStore.get("1-2")?.bg).toBe("#1a88e2")
    expect(domStore.get("1-2")?.classes.has("is-wall")).toBe(true)

    const result = buffer.endStroke()
    expect(result).not.toBeNull()
    expect(result?.wallNodes.has("1-1")).toBe(true)
    expect(result?.wallNodes.has("1-2")).toBe(true)
    expect(result?.finishedBrush).toBe("wall")

    // DOM inline preview styling should be cleared for React to take over
    expect(domStore.get("1-1")?.bg).toBe("")
    expect(domStore.get("1-2")?.bg).toBe("")
  })

  it("toggles walls off when painting over an existing wall", () => {
    const { elementProvider } = createMockElementProvider()
    const buffer = new GridPaintBuffer(
      { wallNodes: new Set(["2-2"]), robotNode: "0-0", destinationNode: "5-5" },
      elementProvider,
    )

    buffer.startStroke("2-2", "wall", 1)
    const result = buffer.endStroke()

    expect(result?.wallNodes.has("2-2")).toBe(false)
  })

  it("paints terrain factors (dirt and water) and toggles them off", () => {
    const { elementProvider, domStore } = createMockElementProvider()
    const buffer = new GridPaintBuffer(
      { robotNode: "0-0", destinationNode: "5-5" },
      elementProvider,
    )

    // Paint dirt (0.5)
    buffer.startStroke("2-1", "dirt", 1)
    expect(domStore.get("2-1")?.bg).toBe("#d2b48c")
    let result = buffer.endStroke()
    expect(result?.terrainFactors.get("2-1")).toBe(0.5)

    // Second click toggles dirt off
    buffer.startStroke("2-1", "dirt", 1)
    result = buffer.endStroke()
    expect(result?.terrainFactors.has("2-1")).toBe(false)

    // Paint water (0.1)
    buffer.startStroke("2-2", "water", 1)
    expect(domStore.get("2-2")?.bg).toBe("#00ffff")
    result = buffer.endStroke()
    expect(result?.terrainFactors.get("2-2")).toBe(0.1)
  })

  it("paints terrain factors with configurable dirt and water penalties and toggles them off", () => {
    const { elementProvider, domStore } = createMockElementProvider()
    const buffer = new GridPaintBuffer(
      { robotNode: "0-0", destinationNode: "5-5" },
      elementProvider,
    )

    // Paint dirt with custom penalty 2.5
    buffer.startStroke("2-1", "dirt", 1, 2.5, 0.1)
    expect(domStore.get("2-1")?.bg).toBe("#d2b48c")
    let result = buffer.endStroke()
    expect(result?.terrainFactors.get("2-1")).toBe(2.5)
    expect(result?.terrainTypes.get("2-1")).toBe("dirt")

    // Second click with same 2.5 penalty toggles dirt off
    buffer.startStroke("2-1", "dirt", 1, 2.5, 0.1)
    result = buffer.endStroke()
    expect(result?.terrainFactors.has("2-1")).toBe(false)
    expect(result?.terrainTypes.has("2-1")).toBe(false)

    // Paint water with custom penalty 1.8
    buffer.startStroke("3-3", "water", 1, 2.5, 1.8)
    expect(domStore.get("3-3")?.bg).toBe("#00ffff")
    result = buffer.endStroke()
    expect(result?.terrainFactors.get("3-3")).toBe(1.8)
    expect(result?.terrainTypes.get("3-3")).toBe("water")

    // Painting dirt over existing water cell replaces it
    buffer.startStroke("3-3", "dirt", 1, 3.0, 1.8)
    expect(domStore.get("3-3")?.bg).toBe("#d2b48c")
    result = buffer.endStroke()
    expect(result?.terrainFactors.get("3-3")).toBe(3.0)
    expect(result?.terrainTypes.get("3-3")).toBe("dirt")
  })

  it("prevents dragging robot onto an unstable elevation slope", () => {
    const { elementProvider } = createMockElementProvider()
    // A cliff at 2-3 creates an unstable slope at 2-2
    const buffer = new GridPaintBuffer(
      {
        robotNode: "2-1",
        destinationNode: "5-5",
        elevations: new Map([["2-3", 10]]),
      },
      elementProvider,
    )

    // Start drag on robot
    buffer.startStroke("2-1", "wall", 1)

    // Attempt to drag robot onto unstable slope at 2-2
    const moveRes = buffer.continueStroke("2-2")
    expect(moveRes).toBeNull()
    expect(buffer.getSnapshot().robotNode).toBe("2-1")
  })

  it("skips painting elevation over robot node if it would cause instability", () => {
    const { elementProvider } = createMockElementProvider()
    const buffer = new GridPaintBuffer(
      {
        robotNode: "2-2",
        destinationNode: "5-5",
        elevations: new Map([["2-3", 10]]),
      },
      elementProvider,
    )

    // Start stroke on 0-0 (far from 2-2)
    buffer.startStroke("0-0", "elevation", 10)
    // Continue stroke onto robot node 2-2 where right neighbor 2-3 is a cliff
    buffer.continueStroke("2-2")
    const result = buffer.endStroke()

    // 0-0 should be painted, but robot node 2-2 should NOT have elevation 10
    expect(result?.elevations.get("0-0")).toBe(10)
    expect(result?.elevations.has("2-2")).toBe(false)
  })

  it("moves robot and destination on drag and avoids wall collisions", () => {
    const { elementProvider } = createMockElementProvider()
    const buffer = new GridPaintBuffer(
      {
        wallNodes: new Set(["0-2"]),
        robotNode: "0-0",
        destinationNode: "5-5",
      },
      elementProvider,
    )

    // Start drag on robot
    const startRes = buffer.startStroke("0-0", "wall", 1)
    expect(startRes?.robotMoved).toBe("0-0")

    // Move to open cell
    const moveRes = buffer.continueStroke("0-1")
    expect(moveRes?.robotMoved).toBe("0-1")

    // Cannot move into wall "0-2"
    const wallCollision = buffer.continueStroke("0-2")
    expect(wallCollision).toBeNull()

    // Cannot move onto destination "5-5"
    const destCollision = buffer.continueStroke("5-5")
    expect(destCollision).toBeNull()

    const commit = buffer.endStroke()
    expect(commit?.robotNode).toBe("0-1")
  })

  it("aborts stroke and restores previous snapshot", () => {
    const { elementProvider } = createMockElementProvider()
    const buffer = new GridPaintBuffer(
      { wallNodes: new Set(["1-1"]), robotNode: "0-0", destinationNode: "5-5" },
      elementProvider,
    )

    buffer.startStroke("1-2", "wall", 1)
    buffer.continueStroke("1-3")
    expect(buffer.getSnapshot().wallNodes.has("1-2")).toBe(true)

    buffer.abortStroke()
    expect(buffer.isSessionActive()).toBe(false)
    expect(buffer.getSnapshot().wallNodes.has("1-2")).toBe(false)
    expect(buffer.getSnapshot().wallNodes.has("1-1")).toBe(true)
  })

  it("clears all walls, terrain, and elevations along with DOM styling", () => {
    const { elementProvider, domStore } = createMockElementProvider()
    const buffer = new GridPaintBuffer(
      {
        wallNodes: new Set(["1-1", "1-2"]),
        terrainFactors: new Map([["2-1", 0.5]]),
        elevations: new Map([["3-1", 3]]),
        robotNode: "0-0",
        destinationNode: "5-5",
      },
      elementProvider,
    )

    // Simulate DOM had .is-wall on 1-1
    domStore.get("1-1")?.classes.add("is-wall")

    const cleared = buffer.clear()
    expect(cleared.wallNodes.size).toBe(0)
    expect(cleared.terrainFactors.size).toBe(0)
    expect(cleared.terrainTypes.size).toBe(0)
    expect(cleared.elevations.size).toBe(0)

    expect(domStore.get("1-1")?.classes.has("is-wall")).toBe(false)
  })
})
