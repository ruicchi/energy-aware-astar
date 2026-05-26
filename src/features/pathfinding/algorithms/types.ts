import { Scenario, EnergyBreakdown } from "../../../shared/types"

export type VisitedNode = { key: string; type: "open" | "closed" }

export interface PathfindingResult {
  visitedNodesInOrder: VisitedNode[]
  shortestPath: string[]
  totalDistance: number
  totalEnergy: number
  energyBreakdown: EnergyBreakdown
}

export interface PathfindingAlgorithm {
  id: string
  name: string
  theme: "energy" | "manhattan"
  execute: (scenario: Scenario) => PathfindingResult
}
