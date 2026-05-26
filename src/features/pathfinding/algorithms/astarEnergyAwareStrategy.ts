import type { PathfindingAlgorithm, PathfindingResult } from "./types";
import { runAStarEnergyAware } from "../../../algorithms/astar/astarEnergyAware";

export const EnergyAwareStrategy: PathfindingAlgorithm = {
  id: "energyAware",
  name: "Energy-Aware A*",
  theme: "energy",
  execute: (scenario): PathfindingResult => {
    return runAStarEnergyAware(scenario) as PathfindingResult;
  },
};
