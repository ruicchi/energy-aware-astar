import { createContext, useContext, useState, ReactNode } from "react"
import { PathfindingResult } from "./algorithms/types"

interface PathfindingContextType {
  selectedAlgo: string
  setSelectedAlgo: (algo: string) => void
  pathMetrics: (PathfindingResult & { algorithm: string }) | null
  setPathMetrics: (metrics: (PathfindingResult & { algorithm: string }) | null) => void
  isAnimating: boolean
  setIsAnimating: (anim: boolean) => void
}

const PathfindingContext = createContext<PathfindingContextType | null>(null)

export const usePathfindingContext = () => {
  const ctx = useContext(PathfindingContext)
  if (!ctx) throw new Error("usePathfindingContext must be used within PathfindingProvider")
  return ctx
}

export const PathfindingProvider = ({ children }: { children: ReactNode }) => {
  const [selectedAlgo, setSelectedAlgo] = useState("energyAware")
  const [pathMetrics, setPathMetrics] = useState<(PathfindingResult & { algorithm: string }) | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  return (
    <PathfindingContext.Provider value={{
      selectedAlgo, setSelectedAlgo, pathMetrics, setPathMetrics,
      isAnimating, setIsAnimating
    }}>
      {children}
    </PathfindingContext.Provider>
  )
}
