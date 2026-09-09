import { describe, it, expect } from "vitest";
import {
  calcStats,
  standardNormalCdf,
  calculatePairedTTest,
  analyzeMonteCarloResults,
} from "./statisticalAnalysis";
import type { AlgorithmBenchmarkResult } from "./benchmarkEngine";

describe("Statistical Analysis", () => {
  describe("calcStats", () => {
    it("handles empty arrays", () => {
      expect(calcStats([])).toEqual({ mean: 0, std: 0 });
    });

    it("handles single-item arrays with zero variance", () => {
      expect(calcStats([42])).toEqual({ mean: 42, std: 0 });
    });

    it("calculates accurate mean and sample standard deviation", () => {
      const data = [10, 20, 30];
      const stats = calcStats(data);
      expect(stats.mean).toBe(20);
      expect(stats.std).toBe(10);
    });
  });

  describe("standardNormalCdf", () => {
    it("evaluates known standard normal probabilities", () => {
      expect(standardNormalCdf(0)).toBeCloseTo(0.5, 4);
      expect(standardNormalCdf(1.96)).toBeCloseTo(0.975, 2);
      expect(standardNormalCdf(-1.96)).toBeCloseTo(0.025, 2);
    });
  });

  describe("calculatePairedTTest", () => {
    it("returns null-hypothesis values for small or identical samples", () => {
      expect(calculatePairedTTest([1], [1])).toEqual({ tStat: 0, pValue: 1 });
      expect(calculatePairedTTest([1, 2, 3], [1, 2, 3])).toEqual({ tStat: 0, pValue: 1 });
    });

    it("detects statistically significant difference between paired observations", () => {
      const baseline = [100, 105, 110, 115, 120];
      const improved = [80, 82, 85, 84, 86];
      const result = calculatePairedTTest(baseline, improved);

      expect(result.tStat).toBeGreaterThan(5);
      expect(result.pValue).toBeLessThan(0.001);
    });
  });

  describe("analyzeMonteCarloResults", () => {
    it("aggregates benchmark results across algorithms and calculates relative savings", () => {
      const createDummyResult = (
        scenarioName: string,
        algorithm: "energyAware" | "manhattan",
        totalEnergy: number,
      ): AlgorithmBenchmarkResult => ({
        scenarioName,
        algorithm,
        pathFound: true,
        pathLength: 10,
        totalDistance: 10,
        totalEnergy,
        nodesEvaluated: 50,
        executionTimeMs: 1.5,
        isSafe: true,
        maxSlope: 5,
        energyBreakdown: {
          baseMovement: totalEnergy * 0.5,
          climbingCost: totalEnergy * 0.3,
          turnCost: totalEnergy * 0.2,
          dirtPenalty: 0,
          waterPenalty: 0,
          stabilityPenalty: 0,
          nodesEvaluated: 50,
        },
      });

      const results: AlgorithmBenchmarkResult[] = [
        createDummyResult("scen1", "energyAware", 80),
        createDummyResult("scen1", "manhattan", 100),
        createDummyResult("scen2", "energyAware", 70),
        createDummyResult("scen2", "manhattan", 110),
      ];

      const summary = analyzeMonteCarloResults(results);

      const eaSummary = summary.get("energyAware");
      expect(eaSummary).toBeDefined();
      expect(eaSummary?.meanEnergy).toBe(75);
      expect(eaSummary?.trials).toBe(2);

      const manSummary = summary.get("manhattan");
      expect(manSummary).toBeDefined();
      expect(manSummary?.meanEnergy).toBe(105);
      expect(manSummary?.energySavingsPercentVsEA).toBeGreaterThan(20);
      expect(manSummary?.pValueVsEA).toBeDefined();
    });
  });
});
