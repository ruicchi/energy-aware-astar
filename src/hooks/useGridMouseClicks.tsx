import { useState, useCallback, useRef, useEffect } from "react"
import type { BrushMode } from "../shared/types"
import { GridPaintBuffer } from "../game/gridPaintBuffer"
import { TERRAIN_CONFIG } from "../config/simulationConfig"

export const useGridMouseClicks = (
  initialRobot: string,
  initialDest: string,
  elevationBrushValue: number,
  dirtBrushValue: number = TERRAIN_CONFIG.types.dirt.cost,
  waterBrushValue: number = TERRAIN_CONFIG.types.water.cost,
) => {
  const [wallNode, setWallNode] = useState<Set<string>>(new Set())
  const [terrainFactors, setTerrainFactors] = useState<Map<string, number>>(new Map())
  const [terrainTypes, setTerrainTypes] = useState<Map<string, "dirt" | "water">>(new Map())
  const [elevations, setElevations] = useState<Map<string, number>>(new Map())
  const [robotNode, setRobotNode] = useState(initialRobot)
  const [destinationNode, setDestinationNode] = useState(initialDest)
  const [activeBrush, setActiveBrush] = useState<BrushMode>("wall")

  const activeBrushRef = useRef<BrushMode>(activeBrush)
  const elevationBrushValueRef = useRef<number>(elevationBrushValue)
  const dirtBrushValueRef = useRef<number>(dirtBrushValue)
  const waterBrushValueRef = useRef<number>(waterBrushValue)
  const robotNodeRef = useRef<string>(robotNode)
  const destinationNodeRef = useRef<string>(destinationNode)

  useEffect(() => {
    activeBrushRef.current = activeBrush
  }, [activeBrush])

  useEffect(() => {
    elevationBrushValueRef.current = elevationBrushValue
  }, [elevationBrushValue])

  useEffect(() => {
    dirtBrushValueRef.current = dirtBrushValue
    setTerrainFactors((prev) => {
      let changed = false
      const next = new Map(prev)
      for (const [key, type] of terrainTypes.entries()) {
        if (type === "dirt" && next.get(key) !== dirtBrushValue) {
          next.set(key, dirtBrushValue)
          changed = true
        }
      }
      if (changed) {
        bufferRef.current.setCommittedState({ terrainFactors: next })
      }
      return changed ? next : prev
    })
  }, [dirtBrushValue, terrainTypes])

  useEffect(() => {
    waterBrushValueRef.current = waterBrushValue
    setTerrainFactors((prev) => {
      let changed = false
      const next = new Map(prev)
      for (const [key, type] of terrainTypes.entries()) {
        if (type === "water" && next.get(key) !== waterBrushValue) {
          next.set(key, waterBrushValue)
          changed = true
        }
      }
      if (changed) {
        bufferRef.current.setCommittedState({ terrainFactors: next })
      }
      return changed ? next : prev
    })
  }, [waterBrushValue, terrainTypes])

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
      dirtBrushValueRef.current,
      waterBrushValueRef.current,
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
      setTerrainTypes(result.terrainTypes)
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
    setTerrainTypes(cleared.terrainTypes)
    setElevations(cleared.elevations)
  }, [])

  return {
    wallNode,
    terrainFactors,
    terrainTypes,
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
