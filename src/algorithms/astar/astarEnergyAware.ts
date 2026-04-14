export type Heading = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'UP_LEFT' | 'UP_RIGHT' | 'DOWN_LEFT' | 'DOWN_RIGHT' | 'NONE'

export type EnergyNode = {
  key: string // "row-col-heading"
  row: number
  col: number
  heading: Heading
  g: number // Cumulative energy cost
  h: number // Heuristic energy to destination
  f: number // g + h
  parent: EnergyNode | null
}

export interface Scenario {
  rows: number
  cols: number
  robotNode: string // "row-col"
  destinationNode: string // "row-col"
  wallNodes: Set<string>
  terrainFactors: Map<string, number>
  elevations: Map<string, number>
  climbingFactor: number
  turnPenalty: number
}

const SQRT2 = 1.414

const NEIGHBORS: { dr: number; dc: number; heading: Heading }[] = [
  { dr: -1, dc: 0, heading: 'UP' },
  { dr: 1, dc: 0, heading: 'DOWN' },
  { dr: 0, dc: -1, heading: 'LEFT' },
  { dr: 0, dc: 1, heading: 'RIGHT' },
  { dr: -1, dc: -1, heading: 'UP_LEFT' },
  { dr: -1, dc: 1, heading: 'UP_RIGHT' },
  { dr: 1, dc: -1, heading: 'DOWN_LEFT' },
  { dr: 1, dc: 1, heading: 'DOWN_RIGHT' },
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
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]]
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
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]]
      index = smallest
    }
  }
}

export const getTurnCost = (current: Heading, target: Heading, penalty: number): number => {
  if (current === 'NONE' || current === target) return 0

  const headings: Heading[] = ['UP', 'UP_RIGHT', 'RIGHT', 'DOWN_RIGHT', 'DOWN', 'DOWN_LEFT', 'LEFT', 'UP_LEFT']
  const currentIndex = headings.indexOf(current)
  const targetIndex = headings.indexOf(target)

  if (currentIndex === -1 || targetIndex === -1) return 0

  let diff = Math.abs(currentIndex - targetIndex)
  if (diff > 4) diff = 8 - diff // Shortest path around the 8-direction circle

  // diff 1 = 45°, diff 2 = 90°, diff 3 = 135°, diff 4 = 180°
  return (diff * 0.5) * penalty
}

export const getEnergyCost = (
  current: EnergyNode,
  target: { row: number; col: number; heading: Heading },
  scenario: Scenario
): number => {
  const targetKey = `${target.row}-${target.col}`
  const terrainFactor = scenario.terrainFactors.get(targetKey) || 0
  const currentElevation = scenario.elevations.get(`${current.row}-${current.col}`) || 0
  const targetElevation = scenario.elevations.get(targetKey) || 0

  const elevationDelta = targetElevation - currentElevation

  // Uphill costs more (climbingFactor), Downhill saves energy (0.5 recovery factor)
  const climbingCost = elevationDelta > 0
    ? elevationDelta * scenario.climbingFactor
    : elevationDelta * 0.5

  const turnCost = getTurnCost(current.heading, target.heading, scenario.turnPenalty)

  // Diagonal distance factor (1.0 cardinal, SQRT2 diagonal)
  const isDiagonal = target.heading.includes('_')
  const stepDistance = isDiagonal ? SQRT2 : 1.0

  // Final cost: distance * terrain + climbing/recovery + turn
  return (stepDistance * (1 + terrainFactor)) + climbingCost + turnCost
}

export const runAStarEnergyAware = (scenario: Scenario) => {
  const [destRow, destCol] = scenario.destinationNode.split('-').map(Number)
  const [startRow, startCol] = scenario.robotNode.split('-').map(Number)

  const openSet = new MinHeap()
  const allNodes = new Map<string, EnergyNode>()
  const closedSet = new Set<string>()

  const visitedNodesInOrder: { key: string; type: 'open' | 'closed' }[] = []
  const openedCells = new Set<string>()
  const closedCells = new Set<string>()

  const startNode: EnergyNode = {
    key: `${scenario.robotNode}-NONE`,
    row: startRow,
    col: startCol,
    heading: 'NONE',
    g: 0,
    h: Math.hypot(startRow - destRow, startCol - destCol),
    f: 0,
    parent: null
  }
  startNode.f = startNode.h
  openSet.push(startNode)
  allNodes.set(startNode.key, startNode)

  while (openSet.size() > 0) {
    const current = openSet.pop()!

    // If we've already closed this state (row-col-heading), skip it
    if (closedSet.has(current.key)) continue
    closedSet.add(current.key)

    const cellKey = `${current.row}-${current.col}`

    if (current.row === destRow && current.col === destCol) {
      const shortestPath: string[] = []
      let totalDistance = 0
      let temp: EnergyNode | null = current

      while (temp) {
        shortestPath.unshift(`${temp.row}-${temp.col}`)
        if (temp.parent) {
          const isDiagonal = temp.row !== temp.parent.row && temp.col !== temp.parent.col
          totalDistance += isDiagonal ? SQRT2 : 1.0
        }
        temp = temp.parent
      }

      return {
        visitedNodesInOrder,
        shortestPath: Array.from(new Set(shortestPath)),
        totalEnergy: current.g,
        totalDistance: totalDistance
      }
    }

    if (cellKey !== scenario.robotNode && cellKey !== scenario.destinationNode) {
      // Only record the first time a cell is closed for smoother animation
      if (!closedCells.has(cellKey)) {
        visitedNodesInOrder.push({ key: cellKey, type: 'closed' })
        closedCells.add(cellKey)
      }
    }

    for (const neighbor of NEIGHBORS) {
      const nr = current.row + neighbor.dr
      const nc = current.col + neighbor.dc
      const neighborCellKey = `${nr}-${nc}`
      const neighborStateKey = `${neighborCellKey}-${neighbor.heading}`

      // Boundary and wall checks
      if (
        nr < 0 || nr >= scenario.rows ||
        nc < 0 || nc >= scenario.cols ||
        scenario.wallNodes.has(neighborCellKey) ||
        closedSet.has(neighborStateKey)
      ) continue

      // Strict Corner-Cutting Prevention
      if (neighbor.heading.includes('_')) {
        const cardinal1 = `${current.row + neighbor.dr}-${current.col}`
        const cardinal2 = `${current.row}-${current.col + neighbor.dc}`
        if (scenario.wallNodes.has(cardinal1) || scenario.wallNodes.has(cardinal2)) {
          continue
        }
      }

      const cost = getEnergyCost(current, { row: nr, col: nc, heading: neighbor.heading }, scenario)
      const tentativeG = current.g + cost

      let neighborNode = allNodes.get(neighborStateKey)
      if (!neighborNode || tentativeG < neighborNode.g) {
        if (!neighborNode) {
          neighborNode = {
            key: neighborStateKey,
            row: nr,
            col: nc,
            heading: neighbor.heading,
            g: tentativeG,
            h: Math.hypot(nr - destRow, nc - destCol),
            f: tentativeG + Math.hypot(nr - destRow, nc - destCol),
            parent: current
          }
        } else {
          neighborNode.g = tentativeG
          neighborNode.f = tentativeG + neighborNode.h
          neighborNode.parent = current
        }

        allNodes.set(neighborStateKey, neighborNode)
        openSet.push({ ...neighborNode })

        // Only record the first time a cell is opened for smoother animation
        if (neighborCellKey !== scenario.robotNode && neighborCellKey !== scenario.destinationNode) {
          if (!openedCells.has(neighborCellKey)) {
            visitedNodesInOrder.push({ key: neighborCellKey, type: 'open' })
            openedCells.add(neighborCellKey)
          }
        }
      }
    }
  }

  return { visitedNodesInOrder, shortestPath: [] }
}
