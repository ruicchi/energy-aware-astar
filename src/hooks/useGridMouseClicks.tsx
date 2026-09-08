import { useState, useCallback, useRef, useEffect } from "react"
import type { BrushMode } from "../shared/types"
import { GridPaintBuffer } from "../game/gridPaintBuffer"

export const useGridMouseClicks = (
  initialRobot: string,
  initialDest: string,
  elevationBrushValue: number,
) => {
  const [wallNode, setWallNode] = useState<Set<string>>(new Set())
  const [terrainFactors, setTerrainFactors] = useState<Map<string, number>>(new Map())
  const [elevations, setElevations] = useState<Map<string, number>>(new Map())
  const [robotNode, setRobotNode] = useState(initialRobot)
  const [destinationNode, setDestinationNode] = useState(initialDest)
  const [activeBrush, setActiveBrush] = useState<BrushMode>("wall")

  const activeBrushRef = useRef<BrushMode>(activeBrush)
  const elevationBrushValueRef = useRef<number>(elevationBrushValue)
  const robotNodeRef = useRef<string>(robotNode)
  const destinationNodeRef = useRef<string>(destinationNode)

  useEffect(() => {
    activeBrushRef.current = activeBrush
  }, [activeBrush])

  useEffect(() => {
    elevationBrushValueRef.current = elevationBrushValue
  }, [elevationBrushValue])

  useEffect(() => {
    robotNodeRef.current = robotNode
  }, [robotNode])

  useEffect(() => {
    destinationNodeRef.current = destinationNode
  }, [destinationNode])

  // The deep GridPaintBuffer encapsulates all transient stroke state,
  // DOM preview styles, and atomic commit semantics.
  const bufferRef = useRef<GridPaintBuffer>(
    new GridPaintBuffer({
      robotNode: initialRobot,
      destinationNode: initialDest,
    }),
  )

  const handleMouseDown = useCallback((key: string) => {
    const buffer = bufferRef.current
    buffer.setCommittedState({
      robotNode: robotNodeRef.current,
      destinationNode: destinationNodeRef.current,
    })
    const update = buffer.startStroke(
      key,
      activeBrushRef.current,
      elevationBrushValueRef.current,
    )
    if (update?.robotMoved) {
      robotNodeRef.current = update.robotMoved
      setRobotNode(update.robotMoved)
    }
    if (update?.destinationMoved) {
      destinationNodeRef.current = update.destinationMoved
      setDestinationNode(update.destinationMoved)
    }
  }, [])

  const handleMouseEnter = useCallback((key: string) => {
    const update = bufferRef.current.continueStroke(key)
    if (update?.robotMoved) {
      robotNodeRef.current = update.robotMoved
      setRobotNode(update.robotMoved)
    }
    if (update?.destinationMoved) {
      destinationNodeRef.current = update.destinationMoved
      setDestinationNode(update.destinationMoved)
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    const result = bufferRef.current.endStroke()
    if (!result) return

    if (result.finishedBrush === "wall") {
      setWallNode(result.wallNodes)
    } else if (result.finishedBrush === "dirt" || result.finishedBrush === "water") {
      setTerrainFactors(result.terrainFactors)
    } else if (result.finishedBrush === "elevation") {
      setElevations(result.elevations)
    } else if (result.finishedBrush === "robot") {
      robotNodeRef.current = result.robotNode
      setRobotNode(result.robotNode)
    } else if (result.finishedBrush === "destination") {
      destinationNodeRef.current = result.destinationNode
      setDestinationNode(result.destinationNode)
    }
  }, [])

  const handleClearWalls = useCallback(() => {
    const cleared = bufferRef.current.clear()
    setWallNode(cleared.wallNodes)
    setTerrainFactors(cleared.terrainFactors)
    setElevations(cleared.elevations)
  }, [])

  return {
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
    clearWalls: handleClearWalls,
  }
}
