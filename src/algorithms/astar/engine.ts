import type { Scenario, Heading, EnergyNode, PathfindingResult, AlgorithmType, VisitedNode } from "../../shared/types"
import {
  createEmptyEnergyBreakdown,
  getEnergyCost,
  getMinAngleToDestination,
  isTraversableSlope,
  getShortestPathData,
  markNodeVisited,
  getSpatialCost,
  SQRT2,
} from "../../utils/algorithmUtils"
import * as MinHeap from "./MinHeap"

export interface PathfindingOptions {
  algorithm?: AlgorithmType
}

/**
 * Directional vectors for 4-way movement (cardinal directions only).
 */
const NEIGHBORS_4: { dr: number, dc: number, heading: Heading }[] = [
  { dr: -1, dc: 0, heading: "UP" },
  { dr: 1, dc: 0, heading: "DOWN" },
  { dr: 0, dc: -1, heading: "LEFT" },
  { dr: 0, dc: 1, heading: "RIGHT" },
]

/**
 * Directional vectors for 8-way movement (cardinal and diagonal directions).
 */
const NEIGHBORS_8: { dr: number, dc: number, heading: Heading }[] = [
  ...NEIGHBORS_4,
  { dr: -1, dc: -1, heading: "UP_LEFT" },
  { dr: -1, dc: 1, heading: "UP_RIGHT" },
  { dr: 1, dc: -1, heading: "DOWN_LEFT" },
  { dr: 1, dc: 1, heading: "DOWN_RIGHT" },
]

const manhattanDistance = (r1: number, c1: number, r2: number, c2: number) =>
  Math.abs(r1 - r2) + Math.abs(c1 - c2)

const euclideanDistance = (r1: number, c1: number, r2: number, c2: number) =>
  Math.hypot(r1 - r2, c1 - c2)

const chebyshevDistance = (r1: number, c1: number, r2: number, c2: number) =>
  Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2))

const octileDistance = (r1: number, c1: number, r2: number, c2: number) => {
  const dx = Math.abs(r1 - r2)
  const dy = Math.abs(c1 - c2)
  return dx + dy + (SQRT2 - 2) * Math.min(dx, dy)
}

const S_MAX = 2

const calculateEnergyHeuristic = (
  row: number,
  col: number,
  heading: Heading,
  destRow: number,
  destCol: number,
  scenario: Scenario,
): number => {
  const distance = Math.hypot(row - destRow, col - destCol)
  const hTrans = distance / S_MAX
  const minAngle = getMinAngleToDestination(heading, row, col, destRow, destCol)
  const hRot = scenario.turnPenalty * minAngle

  const currentElevation = scenario.elevations.get(`${row}-${col}`) || 0
  const destElevation = scenario.elevations.get(scenario.destinationNode) || 0
  const elevationDelta = destElevation - currentElevation
  const hElev = elevationDelta > 0 ? elevationDelta * scenario.climbingFactor : 0

  return hTrans + hRot + hElev
}

interface SearchPolicy {
  neighbors: { dr: number, dc: number, heading: Heading }[]
  getStateKey: (row: number, col: number, heading: Heading) => string
  resolveHeading: (neighborHeading: Heading) => Heading
  isMoveBlocked: (
    current: EnergyNode,
    nr: number,
    nc: number,
    neighborHeading: Heading,
    cellKey: string,
    stateKey: string,
    closedSet: Set<string>,
  ) => boolean
  computeStepCost: (
    current: EnergyNode,
    target: { row: number, col: number, heading: Heading },
  ) => number
  computeHeuristic: (
    row: number,
    col: number,
    heading: Heading,
    destRow: number,
    destCol: number,
  ) => number
}

const createEnergyAwarePolicy = (scenario: Scenario): SearchPolicy => ({
  neighbors: NEIGHBORS_8,
  getStateKey: (row, col, heading) => `${row}-${col}-${heading}`,
  resolveHeading: (neighborHeading) => neighborHeading,
  isMoveBlocked: (current, nr, nc, neighborHeading, cellKey, stateKey, closedSet) => {
    if (nr < 0 || nr >= scenario.rows || nc < 0 || nc >= scenario.cols) return true
    if (scenario.wallNodes.has(cellKey)) return true
    if (closedSet.has(stateKey)) return true
    if (neighborHeading.includes("_")) {
      const cardinal1 = `${current.row + (nr - current.row)}-${current.col}`
      const cardinal2 = `${current.row}-${current.col + (nc - current.col)}`
      if (scenario.wallNodes.has(cardinal1) || scenario.wallNodes.has(cardinal2)) return true
    }
    if (!isTraversableSlope(current, { row: nr, col: nc, heading: neighborHeading }, scenario)) {
      return true
    }
    return false
  },
  computeStepCost: (current, target) => getEnergyCost(current, target, scenario),
  computeHeuristic: (row, col, heading, destRow, destCol) =>
    calculateEnergyHeuristic(row, col, heading, destRow, destCol, scenario),
})

const createStandardPolicy = (
  scenario: Scenario,
  algorithm: "manhattan" | "euclidean" | "octile" | "chebyshev",
): SearchPolicy => {
  let hFunc = manhattanDistance
  let neighbors = NEIGHBORS_4

  switch (algorithm) {
    case "euclidean":
      hFunc = euclideanDistance
      neighbors = NEIGHBORS_8
      break
    case "chebyshev":
      hFunc = chebyshevDistance
      neighbors = NEIGHBORS_8
      break
    case "octile":
      hFunc = octileDistance
      neighbors = NEIGHBORS_8
      break
    case "manhattan":
    default:
      hFunc = manhattanDistance
      neighbors = NEIGHBORS_4
      break
  }

  return {
    neighbors,
    getStateKey: (row, col) => `${row}-${col}`,
    resolveHeading: (neighborHeading) => neighborHeading,
    isMoveBlocked: (current, nr, nc, neighborHeading, cellKey, stateKey, closedSet) => {
      if (nr < 0 || nr >= scenario.rows || nc < 0 || nc >= scenario.cols) return true
      if (scenario.wallNodes.has(cellKey)) return true
      if (closedSet.has(stateKey)) return true
      if (neighborHeading.includes("_")) {
        const cardinal1 = `${current.row + (nr - current.row)}-${current.col}`
        const cardinal2 = `${current.row}-${current.col + (nc - current.col)}`
        if (scenario.wallNodes.has(cardinal1) || scenario.wallNodes.has(cardinal2)) return true
      }
      return false
    },
    computeStepCost: (_current, target) => getSpatialCost(target),
    computeHeuristic: (row, col, _heading, destRow, destCol) => hFunc(row, col, destRow, destCol),
  }
}

/**
 * Executes pathfinding on the provided scenario according to the selected search policy.
 * Consolidates open/closed set tracking, priority queue management, corner-cutting checks,
 * and shortest-path telemetry into a single deep module.
 *
 * @param scenario - The complete environment and configuration for the search
 * @param options - Configurable search options, including algorithm type
 * @returns Complete pathfinding result with animation visits and energy breakdown
 */
export const findPath = (
  scenario: Scenario,
  options?: PathfindingOptions,
): PathfindingResult => {
  const algorithm = options?.algorithm ?? "energyAware"
  const policy =
    algorithm === "energyAware"
      ? createEnergyAwarePolicy(scenario)
      : createStandardPolicy(scenario, algorithm)

  const [startRow, startCol] = scenario.robotNode.split("-").map(Number)
  const [destRow, destCol] = scenario.destinationNode.split("-").map(Number)

  const openSet: EnergyNode[] = []
  const allNodes = new Map<string, EnergyNode>()
  const closedSet = new Set<string>()

  const visitedNodesInOrder: VisitedNode[] = []
  const openedCells = new Set<string>()
  const closedCells = new Set<string>()

  const startKey = policy.getStateKey(startRow, startCol, scenario.initialHeading)
  const startNode: EnergyNode = {
    key: startKey,
    row: startRow,
    col: startCol,
    heading: scenario.initialHeading,
    g: 0,
    h: policy.computeHeuristic(startRow, startCol, scenario.initialHeading, destRow, destCol),
    f: 0,
    parent: null,
  }
  startNode.f = startNode.h
  MinHeap.push(openSet, startNode)
  allNodes.set(startNode.key, startNode)

  visitedNodesInOrder.push({ key: scenario.robotNode, type: "open" })
  openedCells.add(scenario.robotNode)

  let nodesEvaluated = 0

  while (openSet.length > 0) {
    const current = MinHeap.pop(openSet)!

    if (closedSet.has(current.key)) continue
    closedSet.add(current.key)
    nodesEvaluated++

    const cellKey = `${current.row}-${current.col}`

    if (current.row === destRow && current.col === destCol) {
      return {
        visitedNodesInOrder,
        ...getShortestPathData(current, scenario, nodesEvaluated),
      }
    }

    markNodeVisited(cellKey, "closed", scenario, visitedNodesInOrder, closedCells)

    for (const neighbor of policy.neighbors) {
      const nr = current.row + neighbor.dr
      const nc = current.col + neighbor.dc
      const neighborCellKey = `${nr}-${nc}`
      const resolvedHeading = policy.resolveHeading(neighbor.heading)
      const neighborStateKey = policy.getStateKey(nr, nc, neighbor.heading)

      if (
        policy.isMoveBlocked(
          current,
          nr,
          nc,
          neighbor.heading,
          neighborCellKey,
          neighborStateKey,
          closedSet,
        )
      ) {
        continue
      }

      const stepCost = policy.computeStepCost(current, {
        row: nr,
        col: nc,
        heading: neighbor.heading,
      })
      const tentativeG = current.g + stepCost

      let neighborNode = allNodes.get(neighborStateKey)
      if (neighborNode && tentativeG >= neighborNode.g) continue

      if (!neighborNode) {
        const h = policy.computeHeuristic(nr, nc, neighbor.heading, destRow, destCol)
        neighborNode = {
          key: neighborStateKey,
          row: nr,
          col: nc,
          heading: resolvedHeading,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        }
      } else {
        neighborNode.g = tentativeG
        neighborNode.f = tentativeG + neighborNode.h
        neighborNode.parent = current
        neighborNode.heading = resolvedHeading
      }

      allNodes.set(neighborStateKey, neighborNode)
      MinHeap.push(openSet, { ...neighborNode })

      markNodeVisited(neighborCellKey, "open", scenario, visitedNodesInOrder, openedCells)
    }
  }

  return {
    visitedNodesInOrder,
    shortestPath: [],
    totalEnergy: 0,
    totalDistance: 0,
    energyBreakdown: createEmptyEnergyBreakdown(),
  }
}
