# Energy-Aware A* Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Energy-Aware A* algorithm that optimizes for battery consumption by factoring in terrain difficulty, elevation changes, and turning costs.

**Architecture:** Use an extended state search `(row, col, heading)` to track orientation-dependent costs (turns). Each cell can be entered from 4 directions, increasing the search space to ensure the most energy-efficient path.

**Tech Stack:** TypeScript, React (visualization), Material UI.

---

### Task 1: Define Core Types and Scenario Interface

**Files:**
- Modify: `src/algorithms/astar/astarEnergyAware.ts`

- [ ] **Step 1: Write the type definitions**
```typescript
export type Heading = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE'

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
```

- [ ] **Step 2: Commit types**
```bash
git add src/algorithms/astar/astarEnergyAware.ts
git commit -m "feat: define core types for energy-aware astar"
```

### Task 2: Implement Energy Cost Helpers

**Files:**
- Modify: `src/algorithms/astar/astarEnergyAware.ts`

- [ ] **Step 1: Implement `getTurnCost` helper**
```typescript
const getTurnCost = (current: Heading, target: Heading, penalty: number): number => {
  if (current === 'NONE' || current === target) return 0
  
  const opposite: Record<Heading, Heading> = {
    'UP': 'DOWN',
    'DOWN': 'UP',
    'LEFT': 'RIGHT',
    'RIGHT': 'LEFT',
    'NONE': 'NONE'
  }
  
  if (target === opposite[current]) return 2 * penalty
  return penalty
}
```

- [ ] **Step 2: Implement `getEnergyCost` helper**
```typescript
const getEnergyCost = (
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
  
  return (1 + terrainFactor) + climbingCost + turnCost
}
```

- [ ] **Step 3: Commit helpers**
```bash
git add src/algorithms/astar/astarEnergyAware.ts
git commit -m "feat: implement energy cost calculation helpers"
```

### Task 3: Implement Core Energy-Aware A* Loop

**Files:**
- Modify: `src/algorithms/astar/astarEnergyAware.ts`

- [ ] **Step 1: Implement the main `runAStarEnergyAware` function**
```typescript
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
    h: Math.abs(startRow - destRow) + Math.abs(startCol - destCol),
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
       // Path reconstruction
       const shortestPath: string[] = []
       let temp: EnergyNode | null = current
       while (temp) {
         shortestPath.unshift(`${temp.row}-${temp.col}`)
         temp = temp.parent
       }
       return { visitedNodesInOrder, shortestPath: Array.from(new Set(shortestPath)) }
    }

    closedSet.add(current.key)
    
    // Visualization: only add unique cell keys
    const cellKey = `${current.row}-${current.col}`
    if (cellKey !== scenario.robotNode && cellKey !== scenario.destinationNode) {
       visitedNodesInOrder.push({ key: cellKey, type: 'closed' })
    }

    const neighbors = [
      { row: current.row - 1, col: current.col, heading: 'UP' as Heading },
      { row: current.row + 1, col: current.col, heading: 'DOWN' as Heading },
      { row: current.row, col: current.col - 1, heading: 'LEFT' as Heading },
      { row: current.row, col: current.col + 1, heading: 'RIGHT' as Heading },
    ]

    for (const neighbor of neighbors) {
      const neighborCellKey = `${neighbor.row}-${neighbor.col}`
      const neighborStateKey = `${neighborCellKey}-${neighbor.heading}`

      if (
        neighbor.row < 0 || neighbor.row >= scenario.rows ||
        neighbor.col < 0 || neighbor.col >= scenario.cols ||
        scenario.wallNodes.has(neighborCellKey) ||
        closedSet.has(neighborStateKey)
      ) continue

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
          h: Math.abs(neighbor.row - destRow) + Math.abs(neighbor.col - destCol),
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
```

- [ ] **Step 2: Commit implementation**
```bash
git add src/algorithms/astar/astarEnergyAware.ts
git commit -m "feat: complete Energy-Aware A* algorithm implementation"
```

### Task 4: Export the new algorithm

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Export `runAStarEnergyAware`**
```typescript
export { runAStarEnergyAware } from './algorithms/astar/astarEnergyAware'
```

- [ ] **Step 2: Commit export**
```bash
git add src/index.ts
git commit -m "feat: export Energy-Aware A* algorithm"
```
