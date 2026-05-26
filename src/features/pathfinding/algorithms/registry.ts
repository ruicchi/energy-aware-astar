import { PathfindingAlgorithm } from "./types"

export const algorithmRegistry: Record<string, PathfindingAlgorithm> = {}

export const getAlgorithm = (id: string): PathfindingAlgorithm => {
  const algo = algorithmRegistry[id]
  if (!algo) throw new Error(`Algorithm ${id} not found`)
  return algo
}
