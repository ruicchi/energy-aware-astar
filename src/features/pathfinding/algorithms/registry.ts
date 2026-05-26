import { PathfindingAlgorithm } from "./types";
import { EnergyAwareStrategy } from "./astarEnergyAwareStrategy";

export const algorithmRegistry: Record<string, PathfindingAlgorithm> = {
  energyAware: EnergyAwareStrategy,
};

export const getAlgorithm = (id: string): PathfindingAlgorithm => {
  const algo = algorithmRegistry[id];
  if (!algo) throw new Error(`Algorithm ${id} not found`);
  return algo;
};
