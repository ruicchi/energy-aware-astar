import { describe, it, expect } from "vitest";
import { exportToCsv } from "./csvReporter";
import {
  generateDeterministicLatexTable,
  generateMonteCarloLatexTable,
  generateEnergyBreakdownLatexTable,
} from "./latexReporter";
import type { AlgorithmBenchmarkResult } from "../benchmarkEngine";
import type { StatisticalSummary } from "../statisticalAnalysis";
import type { AlgorithmType } from "../../shared/types";

describe("Benchmark Reporters", () => {
  const dummyResult: AlgorithmBenchmarkResult = {
    scenarioName: "Mixed Terrain",
    algorithm: "energyAware",
    pathFound: true,
    pathLength: 12,
    totalDistance: 14.5,
    totalEnergy: 92.3,
    nodesEvaluated: 120,
    executionTimeMs: 2.34,
    isSafe: true,
    maxSlope: 8.5,
    energyBreakdown: {
      baseMovement: 40.0,
      climbingCost: 25.0,
      turnCost: 15.0,
      dirtPenalty: 7.3,
      waterPenalty: 5.0,
      stabilityPenalty: 0.0,
      nodesEvaluated: 120,
    },
  };

  describe("exportToCsv", () => {
    it("serializes headers and rows correctly", () => {
      const csv = exportToCsv([dummyResult]);
      const lines = csv.split("\n");

      expect(lines[0]).toContain("Scenario,Algorithm,PathFound,IsSafe");
      expect(lines[1]).toContain('"Mixed Terrain"');
      expect(lines[1]).toContain('"energyAware"');
      expect(lines[1]).toContain("92.3");
    });
  });

  describe("generateDeterministicLatexTable", () => {
    it("generates booktabs LaTeX table structure", () => {
      const latex = generateDeterministicLatexTable([dummyResult]);

      expect(latex).toContain("\\begin{table*}[t]");
      expect(latex).toContain("\\caption{Performance Comparison of Path-Planning Algorithms across Deterministic Benchmark Scenarios}");
      expect(latex).toContain("\\toprule");
      expect(latex).toContain("\\bottomrule");
      expect(latex).toContain("Energy-Aware A*");
      expect(latex).toContain("\\checkmark");
    });
  });

  describe("generateMonteCarloLatexTable", () => {
    it("formats statistical summaries with standard errors and p-values", () => {
      const summaryMap = new Map<AlgorithmType, StatisticalSummary>([
        [
          "energyAware",
          {
            algorithm: "energyAware",
            trials: 50,
            meanDistance: 15.2,
            stdDistance: 1.1,
            meanEnergy: 85.0,
            stdEnergy: 6.2,
            meanNodes: 110,
            stdNodes: 12,
            meanTimeMs: 2.1,
            stdTimeMs: 0.3,
            safetyRatePercent: 100,
          },
        ],
        [
          "euclidean",
          {
            algorithm: "euclidean",
            trials: 50,
            meanDistance: 13.8,
            stdDistance: 0.9,
            meanEnergy: 112.5,
            stdEnergy: 9.4,
            meanNodes: 75,
            stdNodes: 8,
            meanTimeMs: 1.2,
            stdTimeMs: 0.2,
            safetyRatePercent: 82.0,
            energySavingsPercentVsEA: 24.4,
            pValueVsEA: 0.0001,
          },
        ],
      ]);

      const latex = generateMonteCarloLatexTable(summaryMap);

      expect(latex).toContain("\\begin{table*}[t]");
      expect(latex).toContain("\\caption{Monte Carlo Statistical Evaluation ($N = 50$ Random Topographic Trials)}");
      expect(latex).toContain("Energy-Aware A*");
      expect(latex).toContain("-- (Baseline)");
      expect(latex).toContain("Euclidean A*");
      expect(latex).toContain("+24.4\\%");
      expect(latex).toContain("$p < 0.001$");
    });
  });

  describe("generateEnergyBreakdownLatexTable", () => {
    it("formats component-wise energy breakdowns", () => {
      const latex = generateEnergyBreakdownLatexTable([dummyResult]);

      expect(latex).toContain("\\caption{Component-Wise Energy Breakdown across Tested Heuristics (Scenario: Mixed Terrain)}");
      expect(latex).toContain("Base (J)");
      expect(latex).toContain("Climbing (J)");
      expect(latex).toContain("Turning (J)");
      expect(latex).toContain("40.00");
    });
  });
});
