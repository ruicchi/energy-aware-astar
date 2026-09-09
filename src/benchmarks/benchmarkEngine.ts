import { findPath } from "../algorithms/astar/engine";
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
export const runAlgorithmBenchmark = (
  scenarioName: string,
  scenario: Scenario,
  algorithm: AlgorithmType,
): AlgorithmBenchmarkResult => {
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
};

/**
 * Runs all 5 algorithms on a single scenario.
 */
export const runScenarioSuite = (
  scenarioName: string,
  scenario: Scenario,
): AlgorithmBenchmarkResult[] => {
  return ALGORITHMS.map((algo) => runAlgorithmBenchmark(scenarioName, scenario, algo));
};

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

export interface StatisticalSummary {
  algorithm: AlgorithmType;
  trials: number;
  meanDistance: number;
  stdDistance: number;
  meanEnergy: number;
  stdEnergy: number;
  meanNodes: number;
  stdNodes: number;
  meanTimeMs: number;
  stdTimeMs: number;
  safetyRatePercent: number;
  energySavingsPercentVsEA?: number; // relative savings of EA vs this algo
  pValueVsEA?: number;
}

/**
 * Calculates mean and sample standard deviation.
 */
const calcStats = (values: number[]): { mean: number; std: number } => {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (values.length === 1) return { mean, std: 0 };
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return { mean, std: Math.sqrt(variance) };
};

/**
 * Normal CDF approximation (for large sample two-tailed p-value calculation).
 */
const standardNormalCdf = (z: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
};

/**
 * Performs paired two-tailed t-test between two arrays of paired samples.
 */
export const calculatePairedTTest = (
  baseline: number[],
  energyAware: number[],
): { tStat: number; pValue: number } => {
  const n = baseline.length;
  if (n < 2) return { tStat: 0, pValue: 1 };

  const diffs = baseline.map((b, i) => b - energyAware[i]);
  const { mean: meanDiff, std: stdDiff } = calcStats(diffs);

  if (stdDiff === 0) return { tStat: meanDiff !== 0 ? 99.9 : 0, pValue: meanDiff !== 0 ? 0 : 1 };

  const se = stdDiff / Math.sqrt(n);
  const tStat = meanDiff / se;
  const pValue = 2 * (1 - standardNormalCdf(Math.abs(tStat)));

  return { tStat, pValue };
};

/**
 * Computes complete statistical summary across Monte Carlo runs.
 */
export const analyzeMonteCarloResults = (
  results: AlgorithmBenchmarkResult[],
): Map<AlgorithmType, StatisticalSummary> => {
  const summaryMap = new Map<AlgorithmType, StatisticalSummary>();

  const eaResults = results.filter((r) => r.algorithm === "energyAware");

  for (const algo of ALGORITHMS) {
    const algoResults = results.filter((r) => r.algorithm === algo);
    const n = algoResults.length;
    if (n === 0) continue;

    const completedResults = algoResults.filter((r) => r.pathFound);
    const distances = completedResults.map((r) => r.totalDistance);
    const energies = completedResults.map((r) => r.totalEnergy);
    const nodes = algoResults.map((r) => r.nodesEvaluated);
    const times = algoResults.map((r) => r.executionTimeMs);
    const safeCount = completedResults.filter((r) => r.isSafe).length;

    const distStats = calcStats(distances);
    const energyStats = calcStats(energies);
    const nodeStats = calcStats(nodes);
    const timeStats = calcStats(times);

    let energySavingsPercentVsEA: number | undefined;
    let pValueVsEA: number | undefined;

    if (algo !== "energyAware") {
      const pairedAlgo: number[] = [];
      const pairedEA: number[] = [];

      for (const res of completedResults) {
        const matchEA = eaResults.find((ea) => ea.scenarioName === res.scenarioName && ea.pathFound);
        if (matchEA) {
          pairedAlgo.push(res.totalEnergy);
          pairedEA.push(matchEA.totalEnergy);
        }
      }

      if (pairedAlgo.length > 1) {
        const meanAlgo = calcStats(pairedAlgo).mean;
        const meanEA = calcStats(pairedEA).mean;
        energySavingsPercentVsEA = meanAlgo > 0 ? ((meanAlgo - meanEA) / meanAlgo) * 100 : 0;
        const tTest = calculatePairedTTest(pairedAlgo, pairedEA);
        pValueVsEA = tTest.pValue;
      }
    }

    summaryMap.set(algo, {
      algorithm: algo,
      trials: n,
      meanDistance: distStats.mean,
      stdDistance: distStats.std,
      meanEnergy: energyStats.mean,
      stdEnergy: energyStats.std,
      meanNodes: nodeStats.mean,
      stdNodes: nodeStats.std,
      meanTimeMs: timeStats.mean,
      stdTimeMs: timeStats.std,
      safetyRatePercent: completedResults.length > 0 ? (safeCount / completedResults.length) * 100 : 0,
      energySavingsPercentVsEA,
      pValueVsEA,
    });
  }

  return summaryMap;
};


/**
 * Formats deterministic case studies into a LaTeX booktabs table for Chapter 4.
 */
export const generateDeterministicLatexTable = (
  results: AlgorithmBenchmarkResult[],
): string => {
  let latex = `\\begin{table*}[t]
\\centering
\\caption{Performance Comparison of Path-Planning Algorithms across Deterministic Benchmark Scenarios}
\\label{tab:deterministic_benchmarks}
\\begin{tabular}{llcccccc}
\\toprule
\\textbf{Scenario} & \\textbf{Algorithm} & \\textbf{Distance (m)} & \\textbf{Energy (J)} & \\textbf{Climbing (J)} & \\textbf{Turning (J)} & \\textbf{Nodes Evaluated} & \\textbf{Safe?} \\\\
\\midrule\n`;

  const scenarios = Array.from(new Set(results.map((r) => r.scenarioName)));

  scenarios.forEach((scen, scenIdx) => {
    const scenResults = results.filter((r) => r.scenarioName === scen);
    scenResults.forEach((r, idx) => {
      const isFirst = idx === 0;
      const scenLabel = isFirst ? `\\multirow{5}{*}{\\textbf{${scen}}}` : "";
      const algoLabel = ALGORITHM_LABELS[r.algorithm];
      const safeLabel = r.isSafe ? "\\checkmark" : "\\texttimes";
      latex += `${scenLabel} & ${algoLabel} & ${r.totalDistance.toFixed(2)} & ${r.totalEnergy.toFixed(2)} & ${r.energyBreakdown.climbingCost.toFixed(2)} & ${r.energyBreakdown.turnCost.toFixed(2)} & ${r.nodesEvaluated} & ${safeLabel} \\\\\n`;
    });
    if (scenIdx < scenarios.length - 1) {
      latex += `\\midrule\n`;
    }
  });

  latex += `\\bottomrule
\\end{tabular}
\\end{table*}`;

  return latex;
};

/**
 * Formats Monte Carlo statistical summary into a LaTeX table for Chapter 4.
 */
export const generateMonteCarloLatexTable = (
  summaryMap: Map<AlgorithmType, StatisticalSummary>,
): string => {
  let latex = `\\begin{table*}[t]
\\centering
\\caption{Monte Carlo Statistical Evaluation ($N = 50$ Random Topographic Trials)}
\\label{tab:monte_carlo_results}
\\begin{tabular}{lcccccr}
\\toprule
\\textbf{Algorithm} & \\textbf{Distance (m)} & \\textbf{Total Energy (J)} & \\textbf{Energy Reduction (\\%)} & \\textbf{Nodes Evaluated} & \\textbf{Safety Rate (\\%)} & \\textbf{$p$-value} \\\\
\\midrule\n`;

  for (const algo of ALGORITHMS) {
    const s = summaryMap.get(algo);
    if (!s) continue;
    const label = ALGORITHM_LABELS[algo];
    const distStr = `${s.meanDistance.toFixed(2)} \\pm ${s.stdDistance.toFixed(2)}`;
    const energyStr = `${s.meanEnergy.toFixed(2)} \\pm ${s.stdEnergy.toFixed(2)}`;
    const nodesStr = `${Math.round(s.meanNodes)} \\pm ${Math.round(s.stdNodes)}`;
    const reductionStr =
      s.energySavingsPercentVsEA !== undefined
        ? `+${s.energySavingsPercentVsEA.toFixed(1)}\\%`
        : "-- (Baseline)";
    const safetyStr = `${s.safetyRatePercent.toFixed(1)}\\%`;
    const pStr =
      s.pValueVsEA !== undefined
        ? s.pValueVsEA < 0.001
          ? "$p < 0.001$"
          : `$p = ${s.pValueVsEA.toFixed(3)}$`
        : "--";

    latex += `${label} & ${distStr} & ${energyStr} & ${reductionStr} & ${nodesStr} & ${safetyStr} & ${pStr} \\\\\n`;
  }

  latex += `\\bottomrule
\\end{tabular}
\\end{table*}`;

  return latex;
};

/**
 * Generates an energy breakdown LaTeX table.
 */
export const generateEnergyBreakdownLatexTable = (
  results: AlgorithmBenchmarkResult[],
): string => {
  let latex = `\\begin{table*}[t]
\\centering
\\caption{Component-Wise Energy Breakdown across Tested Heuristics (Scenario: Mixed Terrain)}
\\label{tab:energy_breakdown}
\\begin{tabular}{lcccccc}
\\toprule
\\textbf{Algorithm} & \\textbf{Base (J)} & \\textbf{Climbing (J)} & \\textbf{Turning (J)} & \\textbf{Dirt (J)} & \\textbf{Water (J)} & \\textbf{Total (J)} \\\\
\\midrule\n`;

  const mixedResults = results.filter((r) => r.scenarioName.toLowerCase().includes("mixed"));
  const targetResults = mixedResults.length > 0 ? mixedResults : results.slice(0, 5);

  targetResults.forEach((r) => {
    const label = ALGORITHM_LABELS[r.algorithm];
    const b = r.energyBreakdown;
    latex += `${label} & ${b.baseMovement.toFixed(2)} & ${b.climbingCost.toFixed(2)} & ${b.turnCost.toFixed(2)} & ${b.dirtPenalty.toFixed(2)} & ${b.waterPenalty.toFixed(2)} & ${r.totalEnergy.toFixed(2)} \\\\\n`;
  });

  latex += `\\bottomrule
\\end{tabular}
\\end{table*}`;

  return latex;
};
