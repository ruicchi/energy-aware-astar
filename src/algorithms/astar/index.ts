import type { Scenario } from "../../shared/types"
import { findPath, type PathfindingOptions } from "./engine"

export { findPath, type PathfindingOptions }

export function runAStarEnergyAware(scenario: Scenario) {
  return findPath(scenario, { algorithm: "energyAware" });
}

export function runAStarManhattan(scenario: Scenario) {
  return findPath(scenario, { algorithm: "manhattan" });
}

export function runAStarEuclidean(scenario: Scenario) {
  return findPath(scenario, { algorithm: "euclidean" });
}

export function runAStarOctile(scenario: Scenario) {
  return findPath(scenario, { algorithm: "octile" });
}

export function runAStarChebyshev(scenario: Scenario) {
  return findPath(scenario, { algorithm: "chebyshev" });
}

