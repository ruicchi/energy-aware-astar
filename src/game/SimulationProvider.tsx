import { useState, useRef, useCallback } from "react"
import type { ReactNode } from "react"
import { useViewport } from "../hooks/useViewport"
import { useGridMouseClicks } from "../hooks/useGridMouseClicks"
import { usePathAnimation } from "../hooks/usePathAnimation"
import { useRobotWalk } from "../hooks/useRobotWalk"
import { findPath } from "../algorithms/astar"
import type { Scenario, Heading, AlgorithmType, EnergyBreakdown } from "../shared/types"
import { SimulationContext } from "./SimulationContext"

interface SimulationProviderProps {
  children: ReactNode
}

export const SimulationProvider = ({ children }: SimulationProviderProps) => {
  const viewport = useViewport()
  const cellSize = viewport.width < 600 ? 20 : 28
  const cols = Math.floor(viewport.width / cellSize)
  const rows = Math.floor(viewport.height / cellSize)

  const defaultRobotCol = Math.floor(cols / 4)
  const defaultDestCol = Math.floor((cols / 4) * 3)
  const defaultRow = Math.floor(rows / 2)

  const [elevationBrushValue, setElevationBrushValue] = useState<number>(5)
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmType>("energyAware")
  const [showGradients, setShowGradients] = useState<boolean>(false)
  const [robotHeading, setRobotHeading] = useState<Heading>("RIGHT")
  const [pathMetrics, setPathMetrics] = useState<{
    algorithm: string
    distance: number
    energy: number
    energyBreakdown: EnergyBreakdown
  } | null>(null)

  const currentRunId = useRef<number>(0)

  const handleSelectAlgo = useCallback((algo: AlgorithmType) => {
    setSelectedAlgo(algo)
    if (algo !== "energyAware") {
      setRobotHeading("NONE")
    }
  }, [])

  const {
    wallNode,
    terrainFactors,
    elevations,
    robotNode,
    destinationNode,
    activeBrush,
    setActiveBrush,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    clearWalls,
  } = useGridMouseClicks(
    `${defaultRow}-${defaultRobotCol}`,
    `${defaultRow}-${defaultDestCol}`,
    elevationBrushValue,
  )

  const {
    isManhattanFinished,
    setIsManhattanFinished,
    isEnergyFinished,
    setIsEnergyFinished,
    isAnimating,
    showManhattanSearch,
    setShowManhattanSearch,
    showEnergySearch,
    setShowEnergySearch,
    clearAnimations,
    animateResult,
    addTimeout,
  } = usePathAnimation()

  const {
    currentPath,
    setCurrentPath,
    walkingStep,
    isWalking,
    hasFinishedWalking,
    walkFailure,
    handleWalkPath,
    clearWalkState,
  } = useRobotWalk(robotHeading, setRobotHeading, addTimeout)

  const isLocked = isAnimating || isWalking

  const toggleGradients = useCallback(() => {
    setShowGradients((prev) => !prev)
  }, [])

  const toggleManhattanSearch = useCallback(() => {
    setShowManhattanSearch((prev) => !prev)
  }, [setShowManhattanSearch])

  const toggleEnergySearch = useCallback(() => {
    setShowEnergySearch((prev) => !prev)
  }, [setShowEnergySearch])

  const getScenario = useCallback((): Scenario => {
    return {
      rows,
      cols,
      robotNode,
      destinationNode,
      wallNodes: wallNode,
      terrainFactors,
      elevations,
      climbingFactor: 1.5,
      turnPenalty: 1.0,
      maxTraversableSlope: 45,
      initialHeading: robotHeading,
      showGradients,
      robotPhysics: {
        trackWidth: 0.8,
        wheelBase: 1.2,
        comHeight: 0.6,
        stabilityMargin: 0.05,
      },
    }
  }, [rows, cols, robotNode, destinationNode, wallNode, terrainFactors, elevations, robotHeading, showGradients])

  const visualize = useCallback((algoToRun?: AlgorithmType) => {
    const algo = algoToRun ?? selectedAlgo
    clearAnimations(clearWalkState)

    const scenario = getScenario()

    const algoConfigs: Record<AlgorithmType, { name: string, theme: "manhattan" | "energy" }> = {
      energyAware: { name: "Energy-Aware A*", theme: "energy" },
      manhattan: { name: "A* Manhattan", theme: "manhattan" },
      euclidean: { name: "A* Euclidean", theme: "energy" },
      octile: { name: "A* Octile", theme: "energy" },
      chebyshev: { name: "A* Chebyshev", theme: "energy" },
    }

    const config = algoConfigs[algo]
    const algoName = config.name
    const theme = config.theme
    const result = findPath(scenario, { algorithm: algo })

    const { visitedNodesInOrder, shortestPath, totalEnergy, totalDistance, energyBreakdown } =
      result

    setPathMetrics({
      algorithm: algoName,
      distance: totalDistance,
      energy: totalEnergy,
      energyBreakdown,
    })

    currentRunId.current += 1
    const runId = currentRunId.current

    setCurrentPath(shortestPath.length > 0 ? shortestPath : null)

    const duration = animateResult(visitedNodesInOrder, shortestPath, theme)

    const finishTimeout = setTimeout(() => {
      if (runId !== currentRunId.current) return
      if (theme === "manhattan") setIsManhattanFinished(true)
      else setIsEnergyFinished(true)
    }, duration)
    addTimeout(finishTimeout as unknown as number)
  }, [selectedAlgo, clearAnimations, clearWalkState, getScenario, setCurrentPath, animateResult, setIsManhattanFinished, setIsEnergyFinished, addTimeout])

  const walkPath = useCallback(() => {
    const scenario = getScenario()
    handleWalkPath(scenario)
  }, [getScenario, handleWalkPath])

  const resetSimulation = useCallback(() => {
    clearWalls()
    clearAnimations(clearWalkState)
    setPathMetrics(null)
    setCurrentPath(null)
  }, [clearWalls, clearAnimations, clearWalkState, setCurrentPath])

  return (
    <SimulationContext.Provider
      value={{
        cols,
        rows,
        cellSize,
        wallNode,
        terrainFactors,
        elevations,
        robotNode,
        destinationNode,
        activeBrush,
        setActiveBrush,
        elevationBrushValue,
        setElevationBrushValue,
        showGradients,
        setShowGradients,
        toggleGradients,
        robotHeading,
        setRobotHeading,
        selectedAlgo,
        setSelectedAlgo,
        handleSelectAlgo,
        pathMetrics,
        isAnimating,
        isManhattanFinished,
        isEnergyFinished,
        showManhattanSearch,
        showEnergySearch,
        toggleManhattanSearch,
        toggleEnergySearch,
        currentPath,
        walkingStep,
        isWalking,
        hasFinishedWalking,
        walkFailure,
        hasPath: !!currentPath,
        isLocked,
        handleMouseDown,
        handleMouseEnter,
        handleMouseUp,
        visualize,
        walkPath,
        clearWalls,
        clearAnimations,
        resetSimulation,
        getScenario,
      }}
    >
      {children}
    </SimulationContext.Provider>
  )
}
