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
  const climbingCost = elevationDelta > 0 ? elevationDelta * scenario.climbingFactor : 0
  
  const turnCost = getTurnCost(current.heading, target.heading, scenario.turnPenalty)
  
  // Diagonal distance factor (1.0 cardinal, 1.414 diagonal)
  const isDiagonal = target.heading.includes('_')
  const stepDistance = isDiagonal ? 1.414 : 1.0
  
  return (stepDistance * (1 + terrainFactor)) + climbingCost + turnCost
}

export const runAStarEnergyAware = (scenario: Scenario) => {
  const [destRow, destCol] = scenario.destinationNode.split('-').map(Number)
  const [startRow, startCol] = scenario.robotNode.split('-').map(Number)

  const openSet: EnergyNode[] = []
  const allNodes = new Map<string, EnergyNode>()
  const closedSet = new Set<string>()

  const visitedNodesInOrder: { key: string; type: 'open' | 'closed' }[] = []

  const startNode: EnergyNode = {
    key: `${scenario.robotNode}-NONE`,
    row: startRow,
    col: startCol,
    heading: 'NONE',
    g: 0,
    // Euclidean heuristic
    h: Math.sqrt(Math.pow(startRow - destRow, 2) + Math.pow(startCol - destCol, 2)),
    f: 0,
    parent: null
  }
  startNode.f = startNode.h
  openSet.push(startNode)
  allNodes.set(startNode.key, startNode)

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f)
    const current = openSet.shift()!

    if (current.row === destRow && current.col === destCol) {
       const shortestPath: string[] = []
       let temp: EnergyNode | null = current
       while (temp) {
         shortestPath.unshift(`${temp.row}-${temp.col}`)
         temp = temp.parent
       }
       return { visitedNodesInOrder, shortestPath: Array.from(new Set(shortestPath)) }
    }

    closedSet.add(current.key)
    
    const cellKey = `${current.row}-${current.col}`
    if (cellKey !== scenario.robotNode && cellKey !== scenario.destinationNode) {
       visitedNodesInOrder.push({ key: cellKey, type: 'closed' })
    }

    const neighbors = [
      // Cardinal
      { row: current.row - 1, col: current.col, heading: 'UP' as Heading, dr: -1, dc: 0 },
      { row: current.row + 1, col: current.col, heading: 'DOWN' as Heading, dr: 1, dc: 0 },
      { row: current.row, col: current.col - 1, heading: 'LEFT' as Heading, dr: 0, dc: -1 },
      { row: current.row, col: current.col + 1, heading: 'RIGHT' as Heading, dr: 0, dc: 1 },
      // Diagonal
      { row: current.row - 1, col: current.col - 1, heading: 'UP_LEFT' as Heading, dr: -1, dc: -1 },
      { row: current.row - 1, col: current.col + 1, heading: 'UP_RIGHT' as Heading, dr: -1, dc: 1 },
      { row: current.row + 1, col: current.col - 1, heading: 'DOWN_LEFT' as Heading, dr: 1, dc: -1 },
      { row: current.row + 1, col: current.col + 1, heading: 'DOWN_RIGHT' as Heading, dr: 1, dc: 1 },
    ]

    for (const neighbor of neighbors) {
      const neighborCellKey = `${neighbor.row}-${neighbor.col}`
      const neighborStateKey = `${neighborCellKey}-${neighbor.heading}`

      // Boundary and wall checks
      if (
        neighbor.row < 0 || neighbor.row >= scenario.rows ||
        neighbor.col < 0 || neighbor.col >= scenario.cols ||
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

      const cost = getEnergyCost(current, neighbor, scenario)
      const tentativeG = current.g + cost
      
      let neighborNode = allNodes.get(neighborStateKey)
      if (!neighborNode) {
        neighborNode = {
          key: neighborStateKey,
          row: neighbor.row,
          col: neighbor.col,
          heading: neighbor.heading,
          g: Infinity,
          h: Math.sqrt(Math.pow(neighbor.row - destRow, 2) + Math.pow(neighbor.col - destCol, 2)),
          f: Infinity,
          parent: null
        }
        allNodes.set(neighborStateKey, neighborNode)
      }

      if (tentativeG < neighborNode.g) {
        neighborNode.g = tentativeG
        neighborNode.f = neighborNode.g + neighborNode.h
        neighborNode.parent = current
        
        if (!openSet.some(n => n.key === neighborStateKey)) {
          openSet.push(neighborNode)
          if (neighborCellKey !== scenario.robotNode && neighborCellKey !== scenario.destinationNode) {
            visitedNodesInOrder.push({ key: neighborCellKey, type: 'open' })
          }
        }
      }
    }
  }

  return { visitedNodesInOrder, shortestPath: [] }
}
