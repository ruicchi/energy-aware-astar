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

export const getTurnCost = (current: Heading, target: Heading, penalty: number): number => {
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
  
  return (1 + terrainFactor) + climbingCost + turnCost
}
