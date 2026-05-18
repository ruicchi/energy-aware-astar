# CoM-Aware Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Santos et al. (2020) Center of Mass (CoM) stability and risk metrics into the Energy-Aware A* algorithm.

**Architecture:** Update `Scenario` to include robot physics (track width, wheel base, CoM height). Implement roll/pitch calculation from terrain gradients. Add stability check (CoM projection in support polygon) as an untraversability constraint and risk-based penalty to the cost function.

**Tech Stack:** TypeScript, React, Material UI.

---

### Task 1: Update Scenario and EnergyNode Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add robot physics parameters to Scenario interface**

```typescript
export interface Scenario {
  // ... existing fields
  robotPhysics?: {
    trackWidth: number // meters
    wheelBase: number // meters
    comHeight: number // meters
    stabilityMargin: number // meters (epsilon)
  }
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/types/index.ts
git commit -m "chore: add robotPhysics to Scenario type"
```

---

### Task 2: Implement Posture and Stability Utilities

**Files:**
- Modify: `src/algorithms/utils.ts`

- [ ] **Step 1: Add posture and stability calculation functions**

```typescript
export const getPosture = (
  row: number,
  col: number,
  heading: Heading,
  scenario: Scenario
): { roll: number; pitch: number } => {
  if (heading === "NONE") return { roll: 0, pitch: 0 }

  const headingAngles: Record<Exclude<Heading, "NONE">, number> = {
    UP: -Math.PI / 2,
    DOWN: Math.PI / 2,
    LEFT: Math.PI,
    RIGHT: 0,
    UP_RIGHT: -Math.PI / 4,
    UP_LEFT: (-3 * Math.PI) / 4,
    DOWN_RIGHT: Math.PI / 4,
    DOWN_LEFT: (3 * Math.PI) / 4,
  }
  const psi = headingAngles[heading as Exclude<Heading, "NONE">]

  // Approximate gradients Zx, Zy using neighboring cells
  const getElevation = (r: number, c: number) => scenario.elevations.get(`${r}-${c}`) || 0
  
  const zLeft = getElevation(row, col - 1)
  const zRight = getElevation(row, col + 1)
  const zUp = getElevation(row - 1, col)
  const zDown = getElevation(row + 1, col)

  const zx = (zRight - zLeft) / 2
  const zy = (zDown - zUp) / 2

  const pitch = Math.atan(zx * Math.cos(psi) + zy * Math.sin(psi))
  const roll = Math.atan(zy * Math.cos(psi) - zx * Math.sin(psi))

  return { roll, pitch }
}

export const isStablePosture = (
  row: number,
  col: number,
  heading: Heading,
  scenario: Scenario
): boolean => {
  if (!scenario.robotPhysics) return true
  
  const { roll, pitch } = getPosture(row, col, heading, scenario)
  const { trackWidth, wheelBase, comHeight, stabilityMargin } = scenario.robotPhysics

  // Project CoM: x_proj = h * tan(pitch), y_proj = h * tan(roll)
  const xProj = comHeight * Math.tan(pitch)
  const yProj = comHeight * Math.tan(roll)

  const halfWidth = trackWidth / 2
  const halfLength = wheelBase / 2

  return (
    Math.abs(xProj) <= halfLength - stabilityMargin &&
    Math.abs(yProj) <= halfWidth - stabilityMargin
  )
}
```

- [ ] **Step 2: Update isTraversableSlope to include stability check**

```typescript
export const isTraversableSlope = (
  current: Pick<EnergyNode, "row" | "col">,
  target: { row: number; col: number; heading: Heading },
  scenario: Scenario
): boolean => {
  const maxTraversableSlope = scenario.maxTraversableSlope ?? DEFAULT_MAX_TRAVERSABLE_SLOPE
  const slopeTraversable = getSlopeDegrees(current, target, scenario) <= maxTraversableSlope
  
  return slopeTraversable && isStablePosture(target.row, target.col, target.heading, scenario)
}
```

- [ ] **Step 3: Commit changes**

```bash
git add src/algorithms/utils.ts
git commit -m "feat: implement posture calculation and stability check"
```

---

### Task 3: Integrate Risk Factor into Energy Cost

**Files:**
- Modify: `src/algorithms/utils.ts`

- [ ] **Step 1: Update getEnergyCostBreakdown to include risk penalty**

```typescript
export const getEnergyCostBreakdown = (
  current: EnergyNode,
  target: { row: number; col: number; heading: Heading },
  scenario: Scenario,
): EnergyBreakdown => {
  // ... existing calculation code ...
  
  const { roll, pitch } = getPosture(target.row, target.col, target.heading, scenario)
  // Risk factor based on combined roll and pitch relative to hypothetical limits
  // Santos et al suggests exponential or weighted risk
  const riskFactor = Math.sqrt(roll * roll + pitch * pitch)
  const riskWeight = 2.0 // k factor
  
  const stabilityPenalty = total * riskWeight * riskFactor
  
  return {
    ...currentBreakdown, // existing fields
    total: total + stabilityPenalty
  }
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/algorithms/utils.ts
git commit -m "feat: add risk-based stability penalty to energy cost"
```

---

### Task 4: Final Validation and Scenario Setup

**Files:**
- Modify: `src/data/scenarios/elevatedTerrain.ts` (or similar)

- [ ] **Step 1: Add robotPhysics to a test scenario**

```typescript
export const elevatedTerrain: Scenario = {
  // ...
  robotPhysics: {
    trackWidth: 0.6,
    wheelBase: 0.8,
    comHeight: 0.4,
    stabilityMargin: 0.05
  }
}
```

- [ ] **Step 2: Run A* and verify path avoidance of high-roll zones**

- [ ] **Step 3: Commit final changes**

```bash
git add src/data/scenarios/elevatedTerrain.ts
git commit -m "test: add robot physics to elevated terrain scenario"
```
