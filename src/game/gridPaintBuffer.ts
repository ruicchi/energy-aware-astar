import type { BrushMode } from "../shared/types"
import { getElevationGradient } from "../physics/terrainPhysics"
import { TERRAIN_CONFIG } from "../config/simulationConfig"

export interface GridState {
  wallNodes: Set<string>
  terrainFactors: Map<string, number>
  elevations: Map<string, number>
  robotNode: string
  destinationNode: string
}

export interface StrokeUpdate {
  robotMoved?: string
  destinationMoved?: string
}

export interface GridCommitResult {
  wallNodes: Set<string>
  terrainFactors: Map<string, number>
  elevations: Map<string, number>
  robotNode: string
  destinationNode: string
  finishedBrush: BrushMode | "robot" | "destination"
}

export interface GridDomElement {
  style: { backgroundColor: string }
  classList: {
    add: (className: string) => void
    remove: (className: string) => void
  }
}

export type GridDomElementProvider = (key: string) => GridDomElement | null

interface ActiveSession {
  brush: BrushMode | "robot" | "destination"
  drawValue: number | boolean | null
  modifiedCells: Set<string>
  previousSnapshot: {
    wallNodes: Set<string>
    terrainFactors: Map<string, number>
    elevations: Map<string, number>
    robotNode: string
    destinationNode: string
  }
}

const defaultElementProvider: GridDomElementProvider = (key: string) => {
  if (typeof document === "undefined") return null
  return document.getElementById(`cell-${key}`)
}

const parseCoordinates = (key: string): [number, number] => {
  const parts = key.split("-")
  return [Number(parts[0]), Number(parts[1])]
}

export class GridPaintBuffer {
  private wallNodes: Set<string>
  private terrainFactors: Map<string, number>
  private elevations: Map<string, number>
  private robotNode: string
  private destinationNode: string
  private session: ActiveSession | null = null
  private elementProvider: GridDomElementProvider

  constructor(
    initialState?: Partial<GridState>,
    elementProvider: GridDomElementProvider = defaultElementProvider,
  ) {
    this.wallNodes = new Set(initialState?.wallNodes ?? [])
    this.terrainFactors = new Map(initialState?.terrainFactors ?? [])
    this.elevations = new Map(initialState?.elevations ?? [])
    this.robotNode = initialState?.robotNode ?? "0-0"
    this.destinationNode = initialState?.destinationNode ?? "0-1"
    this.elementProvider = elementProvider
  }

  public isSessionActive(): boolean {
    return this.session !== null
  }

  public getSnapshot(): GridState {
    return {
      wallNodes: new Set(this.wallNodes),
      terrainFactors: new Map(this.terrainFactors),
      elevations: new Map(this.elevations),
      robotNode: this.robotNode,
      destinationNode: this.destinationNode,
    }
  }

  public setCommittedState(state: Partial<GridState>): void {
    if (state.wallNodes !== undefined) {
      this.wallNodes = new Set(state.wallNodes)
    }
    if (state.terrainFactors !== undefined) {
      this.terrainFactors = new Map(state.terrainFactors)
    }
    if (state.elevations !== undefined) {
      this.elevations = new Map(state.elevations)
    }
    if (state.robotNode !== undefined) {
      this.robotNode = state.robotNode
    }
    if (state.destinationNode !== undefined) {
      this.destinationNode = state.destinationNode
    }
  }

  public startStroke(
    key: string,
    brush: BrushMode,
    elevationBrushValue: number,
  ): StrokeUpdate | null {
    const previousSnapshot = {
      wallNodes: new Set(this.wallNodes),
      terrainFactors: new Map(this.terrainFactors),
      elevations: new Map(this.elevations),
      robotNode: this.robotNode,
      destinationNode: this.destinationNode,
    }

    if (key === this.robotNode) {
      this.session = {
        brush: "robot",
        drawValue: null,
        modifiedCells: new Set(),
        previousSnapshot,
      }
      return { robotMoved: this.robotNode }
    }

    if (key === this.destinationNode) {
      this.session = {
        brush: "destination",
        drawValue: null,
        modifiedCells: new Set(),
        previousSnapshot,
      }
      return { destinationMoved: this.destinationNode }
    }

    let calculatedDrawValue: number | boolean | null = null

    if (brush === "wall") {
      calculatedDrawValue = !this.wallNodes.has(key)
    } else if (brush === "dirt") {
      calculatedDrawValue =
        this.terrainFactors.get(key) !== TERRAIN_CONFIG.types.dirt.cost
          ? TERRAIN_CONFIG.types.dirt.cost
          : 0
    } else if (brush === "water") {
      calculatedDrawValue =
        this.terrainFactors.get(key) !== TERRAIN_CONFIG.types.water.cost
          ? TERRAIN_CONFIG.types.water.cost
          : 0
    } else if (brush === "elevation") {
      const current = this.elevations.get(key) ?? 0
      calculatedDrawValue = current === elevationBrushValue ? 0 : elevationBrushValue
    }

    this.session = {
      brush,
      drawValue: calculatedDrawValue,
      modifiedCells: new Set(),
      previousSnapshot,
    }

    this.applyStrokeToCell(key)
    return null
  }

  public continueStroke(key: string): StrokeUpdate | null {
    if (!this.session) return null

    const { brush } = this.session

    if (brush === "robot") {
      if (key !== this.destinationNode && !this.wallNodes.has(key)) {
        const [r, c] = parseCoordinates(key)
        if (!getElevationGradient(r, c, this.elevations).isUnstable) {
          this.robotNode = key
          return { robotMoved: key }
        }
      }
      return null
    }

    if (brush === "destination") {
      if (key !== this.robotNode && !this.wallNodes.has(key)) {
        const [r, c] = parseCoordinates(key)
        if (!getElevationGradient(r, c, this.elevations).isUnstable) {
          this.destinationNode = key
          return { destinationMoved: key }
        }
      }
      return null
    }

    if (key === this.robotNode || key === this.destinationNode) {
      if (brush === "elevation") {
        const testElevations = new Map(this.elevations)
        testElevations.set(key, this.session.drawValue as number)
        const [r, c] = parseCoordinates(key)
        if (getElevationGradient(r, c, testElevations).isUnstable) {
          return null
        }
      } else {
        return null
      }
    }

    this.applyStrokeToCell(key)
    return null
  }

  public endStroke(): GridCommitResult | null {
    if (!this.session) return null

    const finishedBrush = this.session.brush

    for (const key of this.session.modifiedCells) {
      const element = this.elementProvider(key)
      if (element) {
        element.style.backgroundColor = ""
      }
    }

    this.session = null

    return {
      wallNodes: new Set(this.wallNodes),
      terrainFactors: new Map(this.terrainFactors),
      elevations: new Map(this.elevations),
      robotNode: this.robotNode,
      destinationNode: this.destinationNode,
      finishedBrush,
    }
  }

  public abortStroke(): void {
    if (!this.session) return

    this.wallNodes = this.session.previousSnapshot.wallNodes
    this.terrainFactors = this.session.previousSnapshot.terrainFactors
    this.elevations = this.session.previousSnapshot.elevations
    this.robotNode = this.session.previousSnapshot.robotNode
    this.destinationNode = this.session.previousSnapshot.destinationNode

    for (const key of this.session.modifiedCells) {
      const element = this.elementProvider(key)
      if (element) {
        element.style.backgroundColor = ""
        if (this.session.brush === "wall") {
          if (this.wallNodes.has(key)) {
            element.classList.add("is-wall")
          } else {
            element.classList.remove("is-wall")
          }
        }
      }
    }

    this.session = null
  }

  public clear(): {
    wallNodes: Set<string>
    terrainFactors: Map<string, number>
    elevations: Map<string, number>
  } {
    for (const key of this.wallNodes) {
      const element = this.elementProvider(key)
      if (element) {
        element.style.backgroundColor = ""
        element.classList.remove("is-wall")
      }
    }

    if (this.session) {
      for (const key of this.session.modifiedCells) {
        const element = this.elementProvider(key)
        if (element) {
          element.style.backgroundColor = ""
          element.classList.remove("is-wall")
        }
      }
      this.session = null
    }

    this.wallNodes.clear()
    this.terrainFactors.clear()
    this.elevations.clear()

    return {
      wallNodes: new Set<string>(),
      terrainFactors: new Map<string, number>(),
      elevations: new Map<string, number>(),
    }
  }

  private applyStrokeToCell(key: string): void {
    if (!this.session) return

    const { brush, drawValue } = this.session

    if (brush === "wall") {
      const isWall = Boolean(drawValue)
      if (isWall) {
        this.wallNodes.add(key)
      } else {
        this.wallNodes.delete(key)
      }
      this.session.modifiedCells.add(key)
      this.applyVisual(key, "wall", isWall)
    } else if (brush === "dirt" || brush === "water") {
      const val = Number(drawValue)
      if (val === 0) {
        this.terrainFactors.delete(key)
      } else {
        this.terrainFactors.set(key, val)
      }
      this.session.modifiedCells.add(key)
      this.applyVisual(key, brush, val)
    } else if (brush === "elevation") {
      const val = Number(drawValue)
      if (val === 0) {
        this.elevations.delete(key)
      } else {
        this.elevations.set(key, val)
      }
      this.session.modifiedCells.add(key)
      this.applyVisual(key, "elevation", val)
    }
  }

  private applyVisual(
    key: string,
    mode: "wall" | "dirt" | "water" | "elevation",
    value: number | boolean,
  ): void {
    const element = this.elementProvider(key)
    if (!element) return

    if (mode === "wall") {
      if (value) {
        element.classList.add("is-wall")
        element.style.backgroundColor = TERRAIN_CONFIG.types.wall.color
      } else {
        element.classList.remove("is-wall")
        element.style.backgroundColor = ""
      }
    } else if (mode === "dirt" || mode === "water") {
      if (value === TERRAIN_CONFIG.types.dirt.cost) {
        element.style.backgroundColor = TERRAIN_CONFIG.types.dirt.color
      } else if (value === TERRAIN_CONFIG.types.water.cost) {
        element.style.backgroundColor = TERRAIN_CONFIG.types.water.color
      } else {
        element.style.backgroundColor = ""
      }
    } else if (mode === "elevation") {
      element.style.backgroundColor = TERRAIN_CONFIG.getElevationColor(Number(value))
    }
  }
}
