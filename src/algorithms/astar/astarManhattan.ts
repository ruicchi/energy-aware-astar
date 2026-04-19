import { type Scenario, type Heading, type EnergyNode } from "../../types"
import { getTurnCost } from "../utils"

const NEIGHBORS: { dr: number; dc: number; heading: Heading }[] = [
  { dr: -1, dc: 0, heading: "UP" },
  { dr: 1, dc: 0, heading: "DOWN" },
  { dr: 0, dc: -1, heading: "LEFT" },
  { dr: 0, dc: 1, heading: "RIGHT" },
]

class MinHeap {
  private heap: EnergyNode[] = []

  push(node: EnergyNode) {
    this.heap.push(node)
    this.bubbleUp()
  }

  pop(): EnergyNode | undefined {
    if (this.size() === 0) return undefined
    const top = this.heap[0]
    const bottom = this.heap.pop()!
    if (this.size() > 0) {
      this.heap[0] = bottom
      this.bubbleDown()
    }
    return top
  }

  size() {
    return this.heap.length
  }

  private shouldSwap(childIndex: number, parentIndex: number): boolean {
    const child = this.heap[childIndex]
    const parent = this.heap[parentIndex]
    if (child.f < parent.f) return true
    if (child.f === parent.f) return child.h < parent.h
    return false
  }

  private bubbleUp() {
    let index = this.heap.length - 1
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (!this.shouldSwap(index, parentIndex)) break
      ;[this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]]
      index = parentIndex
    }
  }

  private bubbleDown() {
    let index = 0
    while (true) {
      let smallest = index
      const left = 2 * index + 1
      const right = 2 * index + 2

      if (left < this.heap.length && this.shouldSwap(left, smallest)) smallest = left
      if (right < this.heap.length && this.shouldSwap(right, smallest)) smallest = right

      if (smallest === index) break
      ;[this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]]
      index = smallest
    }
  }
}

const getManhattanHeuristic = (r1: number, c1: number, r2: number, c2: number) => {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2)
}

export const runAStarManhattan = (scenario: Scenario) => {
  const [startRow, startCol] = scenario.robotNode.split("-").map(Number)
  const [destRow, destCol] = scenario.destinationNode.split("-").map(Number)

  const openSet = new MinHeap()
  const allNodes = new Map<string, EnergyNode>()
  const closedSet = new Set<string>()

  const visitedNodesInOrder: { key: string; type: "open" | "closed" }[] = []
  const openedCells = new Set<string>()
  const closedCells = new Set<string>()

  const startNode: EnergyNode = {
    key: `${scenario.robotNode}-${scenario.initialHeading}`,
    row: startRow,
    col: startCol,
    heading: scenario.initialHeading,
    g: 0,
    h: getManhattanHeuristic(startRow, startCol, destRow, destCol),
    f: 0,
    parent: null,
  }
  startNode.f = startNode.h
  openSet.push(startNode)
  allNodes.set(startNode.key, startNode)

  while (openSet.size() > 0) {
    const current = openSet.pop()!

    if (closedSet.has(current.key)) continue
    closedSet.add(current.key)

    const cellKey = `${current.row}-${current.col}`

    if (current.row === destRow && current.col === destCol) {
      const shortestPath: string[] = []
      let temp: EnergyNode | null = current

      while (temp) {
        const pathKey = `${temp.row}-${temp.col}`
        if (shortestPath[0] !== pathKey) {
          shortestPath.unshift(pathKey)
        }
        temp = temp.parent
      }

      return {
        visitedNodesInOrder,
        shortestPath,
        totalEnergy: current.g,
        totalDistance: shortestPath.length - 1,
      }
    }

    if (cellKey !== scenario.robotNode && cellKey !== scenario.destinationNode) {
      if (!closedCells.has(cellKey)) {
        visitedNodesInOrder.push({ key: cellKey, type: "closed" })
        closedCells.add(cellKey)
      }
    }

    for (const neighbor of NEIGHBORS) {
      const nr = current.row + neighbor.dr
      const nc = current.col + neighbor.dc
      const neighborCellKey = `${nr}-${nc}`
      const neighborStateKey = `${neighborCellKey}-${neighbor.heading}`

      if (
        nr < 0 ||
        nr >= scenario.rows ||
        nc < 0 ||
        nc >= scenario.cols ||
        scenario.wallNodes.has(neighborCellKey) ||
        closedSet.has(neighborStateKey)
      ) {
        continue
      }

      // Cost Calculation
      const terrainFactor = scenario.terrainFactors.get(neighborCellKey) || 0
      const baseStepCost = 1.0 * (1 + terrainFactor)

      const currentElevation = scenario.elevations.get(cellKey) || 0
      const targetElevation = scenario.elevations.get(neighborCellKey) || 0
      const elevationDelta = targetElevation - currentElevation
      const climbingCost =
        elevationDelta > 0 ? elevationDelta * scenario.climbingFactor : elevationDelta * 0.5

      const turnCost = getTurnCost(current.heading, neighbor.heading, scenario.turnPenalty)
      const tentativeG = current.g + baseStepCost + climbingCost + turnCost

      let neighborNode = allNodes.get(neighborStateKey)
      if (!neighborNode || tentativeG < neighborNode.g) {
        if (!neighborNode) {
          neighborNode = {
            key: neighborStateKey,
            row: nr,
            col: nc,
            heading: neighbor.heading,
            g: tentativeG,
            h: getManhattanHeuristic(nr, nc, destRow, destCol),
            f: tentativeG + getManhattanHeuristic(nr, nc, destRow, destCol),
            parent: current,
          }
        } else {
          neighborNode.g = tentativeG
          neighborNode.f = tentativeG + neighborNode.h
          neighborNode.parent = current
        }

        allNodes.set(neighborStateKey, neighborNode)
        openSet.push({ ...neighborNode })

        if (
          neighborCellKey !== scenario.robotNode &&
          neighborCellKey !== scenario.destinationNode
        ) {
          if (!openedCells.has(neighborCellKey)) {
            visitedNodesInOrder.push({ key: neighborCellKey, type: "open" })
            openedCells.add(neighborCellKey)
          }
        }
      }
    }
  }

  return { visitedNodesInOrder, shortestPath: [], totalEnergy: 0, totalDistance: 0 }
}
