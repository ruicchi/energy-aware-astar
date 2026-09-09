import type { AlgorithmType } from "../shared/types";
import { ALGORITHMS, type AlgorithmBenchmarkResult } from "./benchmarkEngine";

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
export function calcStats(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (values.length === 1) return { mean, std: 0 };
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Normal CDF approximation (for large sample two-tailed p-value calculation).
 */
export function standardNormalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

/**
 * Performs paired two-tailed t-test between two arrays of paired samples.
 */
export function calculatePairedTTest(
  baseline: number[],
  energyAware: number[],
): { tStat: number; pValue: number } {
  const n = baseline.length;
  if (n < 2) return { tStat: 0, pValue: 1 };

  const diffs = baseline.map((b, i) => b - energyAware[i]);
  const { mean: meanDiff, std: stdDiff } = calcStats(diffs);

  if (stdDiff === 0) return { tStat: meanDiff !== 0 ? 99.9 : 0, pValue: meanDiff !== 0 ? 0 : 1 };

  const se = stdDiff / Math.sqrt(n);
  const tStat = meanDiff / se;
  const pValue = 2 * (1 - standardNormalCdf(Math.abs(tStat)));

  return { tStat, pValue };
}

/**
 * Computes complete statistical summary across Monte Carlo runs.
 */
export function analyzeMonteCarloResults(
  results: AlgorithmBenchmarkResult[],
): Map<AlgorithmType, StatisticalSummary> {
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
