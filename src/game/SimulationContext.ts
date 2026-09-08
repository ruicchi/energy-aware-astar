import { createContext, useContext } from "react"
import type {
  Scenario,
  Heading,
  BrushMode,
  EnergyBreakdown,
  AlgorithmType,
} from "../shared/types"

export interface SimulationContextValue {
  cols: number
  rows: number
  cellSize: number

  wallNode: Set<string>
  terrainFactors: Map<string, number>
  elevations: Map<string, number>
  robotNode: string
  destinationNode: string
  activeBrush: BrushMode
  setActiveBrush: (brush: BrushMode) => void
  elevationBrushValue: number
  setElevationBrushValue: (val: number) => void
  showGradients: boolean
  setShowGradients: (show: boolean) => void
  toggleGradients: () => void

  robotHeading: Heading
  setRobotHeading: (heading: Heading) => void

  selectedAlgo: AlgorithmType
  setSelectedAlgo: (algo: AlgorithmType) => void
  handleSelectAlgo: (algo: AlgorithmType) => void
  pathMetrics: {
    algorithm: string
    distance: number
    energy: number
    energyBreakdown: EnergyBreakdown
  } | null

  isAnimating: boolean
  isManhattanFinished: boolean
  isEnergyFinished: boolean
  showManhattanSearch: boolean
  showEnergySearch: boolean
  isPathVisible: boolean
  pathTheme: "manhattan" | "energy" | null
  toggleManhattanSearch: () => void
  toggleEnergySearch: () => void

  currentPath: string[] | null
  walkingStep: number
  isWalking: boolean
  hasFinishedWalking: boolean
  walkFailure: { row: number, col: number, reason: string } | null
  hasPath: boolean
  isLocked: boolean

  handleMouseDown: (key: string) => void
  handleMouseEnter: (key: string) => void
  handleMouseUp: () => void

  visualize: (algo?: AlgorithmType) => void
  walkPath: () => void
  clearWalls: () => void
  clearAnimations: () => void
  resetSimulation: () => void
  getScenario: () => Scenario
}

export const SimulationContext = createContext<SimulationContextValue | null>(null)

export const useSimulation = (): SimulationContextValue => {
  const ctx = useContext(SimulationContext)
  if (!ctx) {
    throw new Error("useSimulation must be used within a SimulationProvider")
  }
  return ctx
}
