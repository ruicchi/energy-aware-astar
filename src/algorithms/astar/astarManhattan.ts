import { type Scenario, type Heading, type EnergyNode, getTurnCost } from './astarEnergyAware'

//* Manhattan distance heuristic (h)
const getManhattanHeuristic = (
  startRow: number,
  startCol: number,
  destRow: number,
  destCol: number,
) => {
  return Math.abs(startRow - destRow) + Math.abs(startCol - destCol)
}

const reconstructPath = (endNode: EnergyNode): string[] => {
  const shortestPath: string[] = []
  let temp: EnergyNode | null = endNode

  while (temp !== null) {
    const cellKey = `${temp.row}-${temp.col}`
    if (shortestPath[0] !== cellKey) {
      shortestPath.unshift(cellKey)
    }
    temp = temp.parent
  }

  return shortestPath
}

//* Function to run Astar with Manhattan distance and Turn Penalty
export const runAStarManhattan = (scenario: Scenario) => {
  const [startRow, startCol] = scenario.robotNode.split('-').map(Number)
  const [destRow, destCol] = scenario.destinationNode.split('-').map(Number)

  const openSet: EnergyNode[] = []
  const closedSet = new Set<string>()
  const allNodes = new Map<string, EnergyNode>()

  const visitedNodesInOrder: { key: string; type: 'open' | 'closed' }[] = []
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

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f || a.h - b.h)
    const current = openSet.shift()!

    if (closedSet.has(current.key)) continue
    closedSet.add(current.key)

    const cellKey = `${current.row}-${current.col}`

    if (current.row === destRow && current.col === destCol) {
      const shortestPath = reconstructPath(current)
      return { 
        visitedNodesInOrder, 
        shortestPath,
        totalEnergy: current.g,
        totalDistance: shortestPath.length - 1
      }
    }

    if (cellKey !== scenario.robotNode && cellKey !== scenario.destinationNode) {
      if (!closedCells.has(cellKey)) {
        visitedNodesInOrder.push({ key: cellKey, type: 'closed' })
        closedCells.add(cellKey)
      }
    }

    //* Check neighbors (Up, Down, Left, Right)
    const neighbors: { dr: number; dc: number; heading: Heading }[] = [
      { dr: -1, dc: 0, heading: 'UP' },
      { dr: 1, dc: 0, heading: 'DOWN' },
      { dr: 0, dc: -1, heading: 'LEFT' },
      { dr: 0, dc: 1, heading: 'RIGHT' },
    ]

    for (const neighbor of neighbors) {
      const nr = current.row + neighbor.dr
      const nc = current.col + neighbor.dc
      const neighborCellKey = `${nr}-${nc}`
      const neighborStateKey = `${neighborCellKey}-${neighbor.heading}`

      if (
        nr < 0 || nr >= scenario.rows ||
        nc < 0 || nc >= scenario.cols ||
        scenario.wallNodes.has(neighborCellKey) ||
        closedSet.has(neighborStateKey)
      ) {
        continue
      }

      // 1. Base cost + Terrain
      const terrainFactor = scenario.terrainFactors.get(neighborCellKey) || 0
      const baseStepCost = 1.0 * (1 + terrainFactor)

      // 2. Elevation Cost
      const currentElevation = scenario.elevations.get(cellKey) || 0
      const targetElevation = scenario.elevations.get(neighborCellKey) || 0
      const elevationDelta = targetElevation - currentElevation
      const climbingCost = elevationDelta > 0 
        ? elevationDelta * scenario.climbingFactor 
        : elevationDelta * 0.5

      // 3. Turn Penalty
      const turnCost = getTurnCost(current.heading, neighbor.heading, scenario.turnPenalty)

      const totalStepCost = baseStepCost + climbingCost + turnCost
      const tentativeG = current.g + totalStepCost

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
            f: 0,
            parent: current,
          }
        } else {
          neighborNode.g = tentativeG
          neighborNode.parent = current
        }
        neighborNode.f = neighborNode.g + neighborNode.h
        allNodes.set(neighborStateKey, neighborNode)
        openSet.push({ ...neighborNode })

        if (neighborCellKey !== scenario.robotNode && neighborCellKey !== scenario.destinationNode) {
          if (!openedCells.has(neighborCellKey)) {
            visitedNodesInOrder.push({ key: neighborCellKey, type: 'open' })
            openedCells.add(neighborCellKey)
          }
        }
      }
    }
  }

  return { visitedNodesInOrder, shortestPath: [], totalEnergy: 0, totalDistance: 0 }
}
