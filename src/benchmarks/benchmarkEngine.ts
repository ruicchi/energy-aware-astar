import { findPath } from "../algorithms/astar";
import { evaluatePathSafety } from "../physics/terrainPhysics";
import type { Scenario, AlgorithmType, EnergyBreakdown } from "../shared/types";

export interface AlgorithmBenchmarkResult {
  scenarioName: string;
  algorithm: AlgorithmType;
  pathFound: boolean;
  pathLength: number;
  totalDistance: number;
  totalEnergy: number;
  nodesEvaluated: number;
  executionTimeMs: number;
  isSafe: boolean;
  safetyFailureReason?: string;
  maxSlope: number;
  energyBreakdown: EnergyBreakdown;
}

export const ALGORITHMS: AlgorithmType[] = [
  "energyAware",
  "manhattan",
  "euclidean",
  "octile",
  "chebyshev",
];

export const ALGORITHM_LABELS: Record<AlgorithmType, string> = {
  energyAware: "Energy-Aware A*",
  manhattan: "Manhattan A*",
  euclidean: "Euclidean A*",
  octile: "Octile A*",
  chebyshev: "Chebyshev A*",
};

/**
 * Executes a single algorithm on a scenario and collects full telemetry.
 */
export function runAlgorithmBenchmark(
  scenarioName: string,
  scenario: Scenario,
  algorithm: AlgorithmType,
): AlgorithmBenchmarkResult {
  const startTime = performance.now();
  const pathResult = findPath(scenario, { algorithm });
  const endTime = performance.now();
  const executionTimeMs = parseFloat((endTime - startTime).toFixed(3));

  const pathFound = pathResult.shortestPath.length > 0;
  const safety = evaluatePathSafety(pathResult.shortestPath, scenario);

  return {
    scenarioName,
    algorithm,
    pathFound,
    pathLength: pathResult.shortestPath.length,
    totalDistance: parseFloat(pathResult.totalDistance.toFixed(2)),
    totalEnergy: parseFloat(pathResult.totalEnergy.toFixed(2)),
    nodesEvaluated: pathResult.energyBreakdown.nodesEvaluated,
    executionTimeMs,
    isSafe: safety.isSafe,
    safetyFailureReason: safety.failureReason,
    maxSlope: parseFloat(safety.maxSlopeEncountered.toFixed(1)),
    energyBreakdown: pathResult.energyBreakdown,
  };
}

/**
 * Runs all 5 algorithms on a single scenario.
 */
export function runScenarioSuite(
  scenarioName: string,
  scenario: Scenario,
): AlgorithmBenchmarkResult[] {
  return ALGORITHMS.map((algo) => runAlgorithmBenchmark(scenarioName, scenario, algo));
}

// Re-export statistical analysis and publication reporters for backwards compatibility
export {
  calcStats,
  standardNormalCdf,
  calculatePairedTTest,
  analyzeMonteCarloResults,
  type StatisticalSummary,
} from "./statisticalAnalysis";

export {
  exportToCsv,
  generateDeterministicLatexTable,
  generateMonteCarloLatexTable,
  generateEnergyBreakdownLatexTable,
} from "./reporters";
