import { type Heading, type EnergyNode, type Scenario, type EnergyBreakdown } from "../types"

export const SQRT2 = 1.414
export const DEFAULT_MAX_TRAVERSABLE_SLOPE = 45

export const getTurnCost = (current: Heading, target: Heading, penalty: number): number => {
  if (current === "NONE" || current === target) return 0

  const headings: Heading[] = [
    "UP",
    "UP_RIGHT",
    "RIGHT",
    "DOWN_RIGHT",
    "DOWN",
    "DOWN_LEFT",
    "LEFT",
    "UP_LEFT",
  ]
  const currentIndex = headings.indexOf(current)
  const targetIndex = headings.indexOf(target)

  if (currentIndex === -1 || targetIndex === -1) return 0

  let diff = Math.abs(currentIndex - targetIndex)
  if (diff > 4) diff = 8 - diff // Shortest path around the 8-direction circle

  const radians = diff * (Math.PI / 4)
  return radians * penalty
}

export const getMinAngleToDestination = (
  currentHeading: Heading,
  currentRow: number,
  currentCol: number,
  destRow: number,
  destCol: number,
): number => {
  if (currentHeading === "NONE") return 0

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
  const currentAngle = headingAngles[currentHeading as Exclude<Heading, "NONE">]

  const dy = destRow - currentRow
  const dx = destCol - currentCol
  if (dx === 0 && dy === 0) return 0
  const destAngle = Math.atan2(dy, dx)

  let diff = Math.abs(currentAngle - destAngle)
  if (diff > Math.PI) diff = 2 * Math.PI - diff
  return diff
}

export const getSpatialCost = (
  target: { heading: Heading },
): number => {
  return getStepDistance(target.heading)
}

export const getEnergyCost = (
  current: EnergyNode,
  target: { row: number, col: number, heading: Heading },
  scenario: Scenario,
): number => {
  return getEnergyCostBreakdown(current, target, scenario).total
}

const getTerrainPenaltyBreakdown = (
  terrainFactor: number,
  distanceBasis: number,
): Pick<EnergyBreakdown, "dirtPenalty" | "waterPenalty" | "otherTerrainPenalty" | "total"> => {
  const terrainPenalty = distanceBasis * terrainFactor
  const dirtPenalty = terrainFactor === 0.5 ? terrainPenalty : 0
  const waterPenalty = terrainFactor === 0.1 ? terrainPenalty : 0
  const otherTerrainPenalty =
    terrainFactor !== 0 && terrainFactor !== 0.5 && terrainFactor !== 0.1 ? terrainPenalty : 0

  return {
    dirtPenalty,
    waterPenalty,
    otherTerrainPenalty,
    total: dirtPenalty + waterPenalty + otherTerrainPenalty,
  }
}

const addTerrainPenaltyBreakdown = (
  current: Pick<EnergyBreakdown, "dirtPenalty" | "waterPenalty" | "otherTerrainPenalty" | "total">,
  next: Pick<EnergyBreakdown, "dirtPenalty" | "waterPenalty" | "otherTerrainPenalty" | "total">,
): Pick<EnergyBreakdown, "dirtPenalty" | "waterPenalty" | "otherTerrainPenalty" | "total"> => ({
  dirtPenalty: current.dirtPenalty + next.dirtPenalty,
  waterPenalty: current.waterPenalty + next.waterPenalty,
  otherTerrainPenalty: current.otherTerrainPenalty + next.otherTerrainPenalty,
  total: current.total + next.total,
})

const getStepDistance = (heading: Heading): number => {
  return heading.includes("_") ? SQRT2 : 1.0
}

export const getSlopeDegrees = (
  current: Pick<EnergyNode, "row" | "col">,
  target: { row: number, col: number, heading: Heading },
  scenario: Scenario,
): number => {
  const currentElevation = scenario.elevations.get(`${current.row}-${current.col}`) || 0
  const targetElevation = scenario.elevations.get(`${target.row}-${target.col}`) || 0
  const elevationDelta = targetElevation - currentElevation

  return Math.atan(Math.abs(elevationDelta) / getStepDistance(target.heading)) * (180 / Math.PI)
}

export const getPosture = (
  row: number,
  col: number,
  heading: Heading,
  scenario: Scenario,
): { roll: number, pitch: number } => {
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
  scenario: Scenario,
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

export const isTraversableSlope = (
  current: Pick<EnergyNode, "row" | "col">,
  target: { row: number, col: number, heading: Heading },
  scenario: Scenario,
): boolean => {
  const maxTraversableSlope = scenario.maxTraversableSlope ?? DEFAULT_MAX_TRAVERSABLE_SLOPE
  const slopeTraversable = getSlopeDegrees(current, target, scenario) <= maxTraversableSlope

  return slopeTraversable && isStablePosture(target.row, target.col, target.heading, scenario)
}

export const getEnergyCostBreakdown = (
  current: EnergyNode,
  target: { row: number, col: number, heading: Heading },
  scenario: Scenario,
): EnergyBreakdown => {
  const targetKey = `${target.row}-${target.col}`
  const currentKey = `${current.row}-${current.col}`
  
  const startTerrainFactor = scenario.terrainFactors.get(currentKey) || 0
  const targetTerrainFactor = scenario.terrainFactors.get(targetKey) || 0
  
  const currentElevation = scenario.elevations.get(currentKey) || 0
  const targetElevation = scenario.elevations.get(targetKey) || 0

  const elevationDelta = targetElevation - currentElevation
  const stepDistance = getStepDistance(target.heading)
  const isDiagonal = stepDistance === SQRT2
  const straightMovement = isDiagonal ? 0 : stepDistance
  const diagonalMovement = isDiagonal ? stepDistance : 0

  // Uphill costs more (climbingFactor), Downhill saves energy (0.5 recovery factor)
  const climbingCost =
    elevationDelta > 0 ? elevationDelta * scenario.climbingFactor : elevationDelta * 0.5

  const turnCost = getTurnCost(current.heading, target.heading, scenario.turnPenalty)
  
  // Use average terrain factor for the move (0.5 distance in start cell, 0.5 in target cell)
  const startTerrainBreakdown = getTerrainPenaltyBreakdown(startTerrainFactor, stepDistance / 2)
  const targetTerrainBreakdown = getTerrainPenaltyBreakdown(targetTerrainFactor, stepDistance / 2)
  
  const terrainBreakdown = addTerrainPenaltyBreakdown(
    startTerrainBreakdown,
    targetTerrainBreakdown,
  )
  
  const subtotal = stepDistance + terrainBreakdown.total + climbingCost + turnCost

  const { roll, pitch } = getPosture(target.row, target.col, target.heading, scenario)
  const riskFactor = Math.sqrt(roll * roll + pitch * pitch)
  const riskWeight = 2.0
  const stabilityPenalty = subtotal * riskWeight * riskFactor
  
  const total = subtotal + stabilityPenalty

  return {
    baseMovement: stepDistance,
    straightMovement,
    diagonalMovement,
    dirtPenalty: terrainBreakdown.dirtPenalty,
    waterPenalty: terrainBreakdown.waterPenalty,
    otherTerrainPenalty: terrainBreakdown.otherTerrainPenalty,
    elevationCost: climbingCost,
    turnCost,
    stabilityPenalty,
    total,
  }
}

export const createEmptyEnergyBreakdown = (): EnergyBreakdown => ({
  baseMovement: 0,
  straightMovement: 0,
  diagonalMovement: 0,
  dirtPenalty: 0,
  waterPenalty: 0,
  otherTerrainPenalty: 0,
  elevationCost: 0,
  turnCost: 0,
  stabilityPenalty: 0,
  total: 0,
  nodesEvaluated: 0,
})

export const addEnergyBreakdown = (
  total: EnergyBreakdown,
  step: EnergyBreakdown,
): EnergyBreakdown => ({
  baseMovement: total.baseMovement + step.baseMovement,
  straightMovement: total.straightMovement + step.straightMovement,
  diagonalMovement: total.diagonalMovement + step.diagonalMovement,
  dirtPenalty: total.dirtPenalty + step.dirtPenalty,
  waterPenalty: total.waterPenalty + step.waterPenalty,
  otherTerrainPenalty: total.otherTerrainPenalty + step.otherTerrainPenalty,
  elevationCost: total.elevationCost + step.elevationCost,
  turnCost: total.turnCost + step.turnCost,
  stabilityPenalty: total.stabilityPenalty + step.stabilityPenalty,
  total: total.total + step.total,
})

export const getHeadingBetweenNodes = (
  from: Pick<EnergyNode, "row" | "col">,
  to: Pick<EnergyNode, "row" | "col">,
): Heading => {
  const dr = to.row - from.row
  const dc = to.col - from.col

  if (dr === -1 && dc === 0) return "UP"
  if (dr === 1 && dc === 0) return "DOWN"
  if (dr === 0 && dc === -1) return "LEFT"
  if (dr === 0 && dc === 1) return "RIGHT"
  if (dr === -1 && dc === -1) return "UP_LEFT"
  if (dr === -1 && dc === 1) return "UP_RIGHT"
  if (dr === 1 && dc === -1) return "DOWN_LEFT"
  if (dr === 1 && dc === 1) return "DOWN_RIGHT"
  return "NONE"
}

export const getPathEnergyBreakdown = (
  endNode: EnergyNode,
  scenario: Scenario,
): EnergyBreakdown => {
  const steps: EnergyNode[] = []
  let temp: EnergyNode | null = endNode

  while (temp) {
    steps.unshift(temp)
    temp = temp.parent
  }

  let currentSimulatedHeading = scenario.initialHeading

  return steps.slice(1).reduce((total, node, index) => {
    const parent = steps[index]
    const stepHeading = getHeadingBetweenNodes(parent, node)

    // Create a virtual parent node that has the simulated heading
    // This ensures getEnergyCostBreakdown calculates turn costs correctly
    // by comparing currentSimulatedHeading with stepHeading
    const virtualParent: EnergyNode = {
      ...parent,
      heading: currentSimulatedHeading,
    }

    const stepBreakdown = getEnergyCostBreakdown(
      virtualParent,
      { row: node.row, col: node.col, heading: stepHeading },
      scenario,
    )

    currentSimulatedHeading = scenario.initialHeading === "NONE" ? "NONE" : stepHeading
    return addEnergyBreakdown(total, stepBreakdown)
  }, createEmptyEnergyBreakdown())
}
