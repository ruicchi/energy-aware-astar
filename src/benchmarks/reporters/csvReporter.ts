import type { AlgorithmBenchmarkResult } from "../benchmarkEngine";

/**
 * Converts benchmark results into CSV formatted string.
 */
export const exportToCsv = (results: AlgorithmBenchmarkResult[]): string => {
  const headers = [
    "Scenario",
    "Algorithm",
    "PathFound",
    "IsSafe",
    "SafetyFailureReason",
    "Distance",
    "TotalEnergy",
    "NodesEvaluated",
    "ExecutionTimeMs",
    "MaxSlopeDeg",
    "BaseMovement",
    "ClimbingCost",
    "TurnCost",
    "DirtPenalty",
    "WaterPenalty",
    "StabilityPenalty",
  ];

  const rows = results.map((r) => [
    `"${r.scenarioName}"`,
    `"${r.algorithm}"`,
    r.pathFound,
    r.isSafe,
    `"${r.safetyFailureReason ?? "NONE"}"`,
    r.totalDistance,
    r.totalEnergy,
    r.nodesEvaluated,
    r.executionTimeMs,
    r.maxSlope,
    r.energyBreakdown.baseMovement.toFixed(2),
    r.energyBreakdown.climbingCost.toFixed(2),
    r.energyBreakdown.turnCost.toFixed(2),
    r.energyBreakdown.dirtPenalty.toFixed(2),
    r.energyBreakdown.waterPenalty.toFixed(2),
    r.energyBreakdown.stabilityPenalty.toFixed(2),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
};
