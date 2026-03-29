# Design Spec: 8-Way Energy-Aware A* Algorithm

## Overview
Expansion of the Energy-Aware A* algorithm to support 8-way (cardinal + diagonal) movement. This version uses a Euclidean heuristic for admissibility and implements strict corner-cutting prevention to simulate physical robot constraints.

## Goals
- Support 8 directions: UP, DOWN, LEFT, RIGHT, UP_LEFT, UP_RIGHT, DOWN_LEFT, DOWN_RIGHT.
- Optimize battery consumption with distance-proportional diagonal costs (√2).
- Implement proportional turn penalties (45° increments).
- Prevent physical "corner-cutting" through gaps between wall cells.

## Architecture

### Extended State
The search state remains `(row, col, heading)`, but `Heading` now includes 8 possible directions plus `NONE`.

### Energy Cost Function (g)
The cost to move from `current` to `adjacent` is:
`StepEnergy = (StepDistance * (1 + TerrainFactor)) + ClimbingCost + TurnCost`

- **StepDistance:**
    - `1.0` for cardinal moves.
    - `1.414` (√2) for diagonal moves.
- **TurnCost (Proportional):**
    - `0` for 0° change.
    - `0.5 * turnPenalty` for 45° change.
    - `1.0 * turnPenalty` for 90° change.
    - `1.5 * turnPenalty` for 135° change.
    - `2.0 * turnPenalty` for 180° change (reverse).

### Corner-Cutting Prevention (Strict)
A diagonal move to `(r+dr, c+dc)` is ONLY valid if:
1. The target cell `(r+dr, c+dc)` is NOT a wall.
2. The cardinal cell `(r+dr, c)` is NOT a wall.
3. The cardinal cell `(r, c+dc)` is NOT a wall.

### Heuristic (h)
- **Euclidean Distance:** `sqrt((row_diff)² + (col_diff)²)`.
- **Admissibility:** Multiplied by 1.0 (min possible cost per unit distance).

## Data Structures

### Updated Heading Type
```typescript
type Heading = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'UP_LEFT' | 'UP_RIGHT' | 'DOWN_LEFT' | 'DOWN_RIGHT' | 'NONE'
```

## Implementation Plan
1. **Update Types:** Expand `Heading` and ensure `EnergyNode` remains compatible.
2. **Refactor Neighbors:** Update the neighbor expansion loop to include all 8 directions.
3. **Implement Corner-Cutting Logic:** Add checks for adjacent cardinal cells during diagonal expansion.
4. **Update Cost Helpers:**
   - `getTurnCost`: Implement angular difference calculation.
   - `getEnergyCost`: Factor in `StepDistance` (1.0 vs 1.414).
5. **Update Heuristic:** Replace Manhattan with Euclidean formula.

## Testing Strategy
- **Diagonal Efficiency:** Verify the robot takes diagonal paths when they are more energy-efficient than cardinal zig-zags.
- **Corner-Cutting:** Verify the robot navigates AROUND a corner wall rather than cutting through it.
- **Turn Penalty:** Verify the robot prefers wider turns (45°) over sharp turns (90°/135°) when energy-optimal.
