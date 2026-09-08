import { useRef, useState, useCallback } from "react"
import { ANIMATION_CONFIG } from "../config/simulationConfig"

export type VisitedNode = { key: string, type: "open" | "closed" }

export const usePathAnimation = () => {
  const [isManhattanFinished, setIsManhattanFinished] = useState<boolean>(false)
  const [isEnergyFinished, setIsEnergyFinished] = useState<boolean>(false)
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [showManhattanSearch, setShowManhattanSearch] = useState<boolean>(true)
  const [showEnergySearch, setShowEnergySearch] = useState<boolean>(true)
  const [isPathVisible, setIsPathVisible] = useState<boolean>(false)
  const [pathTheme, setPathTheme] = useState<"manhattan" | "energy" | null>(null)

  const animationTimeouts = useRef<number[]>([])

  const clearAnimations = useCallback((onClear?: () => void) => {
    animationTimeouts.current.forEach(clearTimeout)
    animationTimeouts.current = []

    setIsManhattanFinished(false)
    setIsEnergyFinished(false)
    setIsAnimating(false)
    setShowManhattanSearch(true)
    setShowEnergySearch(true)
    setIsPathVisible(false)
    setPathTheme(null)

    if (onClear) onClear()

    document.querySelectorAll("[data-manhattan], [data-energy], [data-path]").forEach((el) => {
      const node = el as HTMLElement
      delete node.dataset.manhattan
      delete node.dataset.energy
      delete node.dataset.path
    })
  }, [])

  const animateResult = useCallback(
    (
      visitedNodesInOrder: VisitedNode[],
      shortestPath: string[],
      mode: "manhattan" | "energy" = "manhattan",
    ): number => {
      const searchAttr = mode === "manhattan" ? "manhattan" : "energy"
      setIsAnimating(true)
      setIsPathVisible(false)
      setPathTheme(mode)

      // Animate Visited/Open Nodes
      for (let i = 0; i < visitedNodesInOrder.length; i++) {
        const timeout = setTimeout(() => {
          const { key, type } = visitedNodesInOrder[i]

          const node = document.getElementById(`cell-${key}`)
          if (node) {
            node.dataset[searchAttr] = type // "open" or "closed"
          }
        }, ANIMATION_CONFIG.searchStepDelayMs * i)
        animationTimeouts.current.push(timeout as unknown as number)
      }

      // Show path line immediately once visited search nodes finish
      const pathDelay = visitedNodesInOrder.length * ANIMATION_CONFIG.searchStepDelayMs
      const finishTimeout = setTimeout(() => {
        if (shortestPath.length > 0) {
          setIsPathVisible(true)
        }
        setIsAnimating(false)
      }, pathDelay)
      animationTimeouts.current.push(finishTimeout as unknown as number)

      return pathDelay
    },
    [],
  )

  const addTimeout = useCallback((t: number) => {
    animationTimeouts.current.push(t)
  }, [])

  return {
    isManhattanFinished,
    setIsManhattanFinished,
    isEnergyFinished,
    setIsEnergyFinished,
    isAnimating,
    showManhattanSearch,
    setShowManhattanSearch,
    showEnergySearch,
    setShowEnergySearch,
    isPathVisible,
    pathTheme,
    clearAnimations,
    animateResult,
    addTimeout,
  }
}
