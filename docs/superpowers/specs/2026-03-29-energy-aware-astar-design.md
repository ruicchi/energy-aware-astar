# Design Spec: Energy-Aware A* Algorithm

## Overview
Implementation of a novel Energy-Aware A* path-planning algorithm that optimizes for battery consumption rather than just distance. The algorithm factors in terrain difficulty, elevation changes, and turning costs using an extended state search (row, col, heading).

## Goals
- Find the most energy-efficient path for an autonomous robot.
- Account for 90° and 180° turning penalties.
- Incorporate terrain-specific energy multipliers.
- Calculate energy costs for climbing elevation.

## Architecture

### Extended State
A node in the search space is defined by its coordinates and the direction from which it was entered:
- `State = (row, col, heading)`
- `Heading = UP | DOWN | LEFT | RIGHT | NONE`

### Energy Cost Function (g)
The cost to move from a `current` node to an `adjacent` cell is:
`StepEnergy = (1 + TerrainFactor) + ClimbingCost + TurnCost`

- **Distance Base:** 1.0 (constant for adjacent cells).
- **TerrainFactor:** Multiplier based on cell difficulty (e.g., sand, gravel). Default 0.
- **ClimbingCost:** If `elevation(target) > elevation(current)`, cost is `(elevationDelta) * climbingFactor`.
- **TurnCost:**
    - `0` if `current.heading === neighborDirection`.
    - `turnPenalty` for a 90° turn.
    - `2 * turnPenalty` for a 180° turn.
    - `0` if `current.heading === NONE` (start node).

### Heuristic (h)
- **Manhattan Distance:** `|targetRow - destRow| + |targetCol - destCol|`.
- **Admissibility:** Multiplied by 1.0 (the minimum possible energy cost per step) to ensure it never overestimates.

## Data Structures

### EnergyNode
```typescript
type Heading = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE'

type EnergyNode = {
  key: string // "row-col-heading"
  row: number
  col: number
  heading: Heading
  g: number // Cumulative energy cost
  h: number // Heuristic energy to destination
  f: number // g + h
  parent: EnergyNode | null
}
```

### Scenario Configuration
```typescript
interface Scenario {
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

## Implementation Plan
1. **Define Types:** Implement `Heading`, `EnergyNode`, and `Scenario` interfaces.
2. **Cost Helpers:** Create functions for `getTurnCost`, `getTerrainCost`, and `getElevationCost`.
3. **Core Loop:**
   - Initialize `openSet` with the start node (heading: `NONE`).
   - Use a `Map<string, EnergyNode>` for `allNodes` to track states by `row-col-heading`.
   - Iterate until the goal `(row, col)` is reached or the `openSet` is empty.
4. **Path Reconstruction:** Trace back from the goal node to the start using `parent` pointers.
5. **Visualization Compatibility:** Return `visitedNodesInOrder` (unique `row-col` pairs) and `shortestPath` (list of `row-col` strings).

## Testing Strategy
- **Baseline:** Verify it matches standard A* on flat, uniform terrain with zero turn penalty.
- **Turn Penalty:** Test a scenario where a longer, straight path is chosen over a shorter path with many turns.
- **Elevation:** Test a scenario where the robot avoids a steep hill in favor of a flatter, longer route.
- **Terrain:** Test a scenario where the robot avoids "heavy" terrain (high terrain factor).
