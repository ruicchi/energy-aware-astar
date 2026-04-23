import { type Scenario, type Heading, type EnergyNode } from "../../types"
import {
  createEmptyEnergyBreakdown,
  getEnergyCostBreakdown,
  getPathEnergyBreakdown,
  isTraversableSlope,
} from "../utils"

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

export const runAStarManhattan = (scenario: Scenario) => {
  const [startRow, startCol] = scenario.robotNode.split("-").map(Number)
  const [destRow, destCol] = scenario.destinationNode.split("-").map(Number)
  const tracksHeading = scenario.initialHeading !== "NONE"

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
    h: Math.abs(startRow - destRow) + Math.abs(startCol - destCol),
    f: 0,
    parent: null,
  }
  startNode.f = startNode.h
  openSet.push(startNode)
  allNodes.set(startNode.key, startNode)

  // Add the start node to visited nodes so the animation starts from the robot's cell
  visitedNodesInOrder.push({ key: scenario.robotNode, type: "open" })
  openedCells.add(scenario.robotNode)

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
      const energyBreakdown = getPathEnergyBreakdown(current, scenario)

      return {
        visitedNodesInOrder,
        shortestPath,
        totalEnergy: current.g,
        totalDistance: shortestPath.length - 1,
        energyBreakdown,
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
      const nodeHeading = tracksHeading ? neighbor.heading : "NONE"
      const neighborStateKey = `${neighborCellKey}-${nodeHeading}`

      if (
        nr < 0 ||
        nr >= scenario.rows ||
        nc < 0 ||
        nc >= scenario.cols ||
        scenario.wallNodes.has(neighborCellKey) ||
        closedSet.has(neighborStateKey) ||
        !isTraversableSlope(
          current,
          { row: nr, col: nc, heading: neighbor.heading },
          scenario,
        )
      ) {
        continue
      }

      const cost = getEnergyCostBreakdown(
        current,
        { row: nr, col: nc, heading: neighbor.heading },
        scenario,
      )
      const tentativeG = current.g + cost.total

      let neighborNode = allNodes.get(neighborStateKey)
      if (!neighborNode || tentativeG < neighborNode.g) {
        if (!neighborNode) {
          const h = Math.abs(nr - destRow) + Math.abs(nc - destCol)
          neighborNode = {
            key: neighborStateKey,
            row: nr,
            col: nc,
            heading: nodeHeading,
            g: tentativeG,
            h: h,
            f: tentativeG + h,
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

  return {
    visitedNodesInOrder,
    shortestPath: [],
    totalEnergy: 0,
    totalDistance: 0,
    energyBreakdown: createEmptyEnergyBreakdown(),
  }
}
