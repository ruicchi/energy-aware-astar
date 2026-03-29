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
