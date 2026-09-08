import type { Scenario } from "../../shared/types"
import { findPath, type PathfindingOptions } from "./engine"

export { findPath, type PathfindingOptions }

export const runAStarEnergyAware = (scenario: Scenario) =>
  findPath(scenario, { algorithm: "energyAware" })

export const runAStarManhattan = (scenario: Scenario) =>
  findPath(scenario, { algorithm: "manhattan" })

export const runAStarEuclidean = (scenario: Scenario) =>
  findPath(scenario, { algorithm: "euclidean" })

export const runAStarOctile = (scenario: Scenario) =>
  findPath(scenario, { algorithm: "octile" })

export const runAStarChebyshev = (scenario: Scenario) =>
  findPath(scenario, { algorithm: "chebyshev" })

