import { describe, it, expect } from "vitest";
import { exportToCsv } from "./csvReporter";
import {
  generateDeterministicLatexTable,
  generateMonteCarloLatexTable,
  generateEnergyBreakdownLatexTable,
} from "./latexReporter";
import { generateMarkdownSummary } from "./markdownReporter";
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
    nodesExpanded: 120,
    nodesGenerated: 250,
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
      nodesExpanded: 120,
      nodesGenerated: 250,
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

  describe("generateMarkdownSummary", () => {
    it("generates markdown summary with statistical table and key findings", () => {
      const summaryMap = new Map<AlgorithmType, StatisticalSummary>([
        [
          "energyAware",
          {
            algorithm: "energyAware",
            trials: 50,
            meanDistance: 38.11,
            stdDistance: 2.80,
            meanEnergy: 41.36,
            stdEnergy: 2.83,
            meanNodes: 1677,
            stdNodes: 350,
            meanTimeMs: 22.0,
            stdTimeMs: 4.5,
            safetyRatePercent: 100,
          },
        ],
        [
          "manhattan",
          {
            algorithm: "manhattan",
            trials: 50,
            meanDistance: 40.0,
            stdDistance: 0.0,
            meanEnergy: 260.40,
            stdEnergy: 159.05,
            meanNodes: 50,
            stdNodes: 9,
            meanTimeMs: 0.16,
            stdTimeMs: 0.04,
            safetyRatePercent: 18.0,
            energySavingsPercentVsEA: 84.1,
            pValueVsEA: 0.0001,
          },
        ],
        [
          "euclidean",
          {
            algorithm: "euclidean",
            trials: 50,
            meanDistance: 30.12,
            stdDistance: 0.75,
            meanEnergy: 291.72,
            stdEnergy: 167.12,
            meanNodes: 127,
            stdNodes: 53,
            meanTimeMs: 0.38,
            stdTimeMs: 0.14,
            safetyRatePercent: 4.0,
            energySavingsPercentVsEA: 85.8,
            pValueVsEA: 0.0001,
          },
        ],
      ]);

      const md = generateMarkdownSummary(summaryMap, 50);

      expect(md).toContain("# Chapter 4: Simulation Results & Discussion Summary");
      expect(md).toContain("Evaluated **50** randomly generated procedural terrains");
      expect(md).toContain("| **Energy-Aware A*** | 38.11 ± 2.80 | 41.36 ± 2.83 | **Baseline** | 1677 ± 350 | **100.0%** | -- |");
      expect(md).toContain("+84.1%");
      expect(md).toContain("+85.8%");
      expect(md).toContain("1. **Significant Energy Conservation:**");
      expect(md).toContain("2. **Topographic Traversability & Rollover Prevention:**");
      expect(md).toContain("3. **Spatial vs. Energetic Trade-off:**");
      expect(md).toContain("4. **Search Complexity:**");
    });
  });

  describe("Polymorphic BenchmarkReporter Presentation Adapters", () => {
    it("CsvReporter formats raw CSV artifact", async () => {
      const { CsvReporter } = await import("./csvReporter");
      const reporter = new CsvReporter();
      const artifacts = reporter.format({ results: [dummyResult] });

      expect(artifacts.length).toBe(1);
      expect(artifacts[0].id).toBe("rawCsv");
      expect(artifacts[0].relativePath).toBe("benchmark_raw.csv");
      expect(artifacts[0].content).toContain("Scenario,Algorithm,PathFound");
    });

    it("LatexReporter formats booktabs table artifacts", async () => {
      const { LatexReporter } = await import("./latexReporter");
      const reporter = new LatexReporter();
      const artifacts = reporter.format({ results: [dummyResult] });

      expect(artifacts.some((a) => a.id === "table1Deterministic")).toBe(true);
      expect(artifacts.some((a) => a.id === "table3EnergyBreakdown")).toBe(true);
      expect(artifacts.find((a) => a.id === "table1Deterministic")?.relativePath).toBe(
        "thesis_tables/table1_deterministic.tex",
      );
    });

    it("MarkdownReporter formats Chapter 4 summary artifact", async () => {
      const { MarkdownReporter } = await import("./markdownReporter");
      const reporter = new MarkdownReporter();
      const summaryMap = new Map<AlgorithmType, StatisticalSummary>([
        [
          "energyAware",
          {
            algorithm: "energyAware",
            trials: 5,
            meanDistance: 10,
            stdDistance: 1,
            meanEnergy: 20,
            stdEnergy: 2,
            meanNodes: 50,
            stdNodes: 5,
            meanTimeMs: 1,
            stdTimeMs: 0.1,
            safetyRatePercent: 100,
          },
        ],
      ]);

      const artifacts = reporter.format({ results: [dummyResult], summaryMap, trialsCount: 5 });
      expect(artifacts.length).toBe(1);
      expect(artifacts[0].id).toBe("summaryMd");
      expect(artifacts[0].relativePath).toBe("benchmark_summary.md");
      expect(artifacts[0].content).toContain("# Chapter 4: Simulation Results & Discussion Summary");
    });

    it("formatBenchmarkTelemetry runs all default adapters", async () => {
      const { formatBenchmarkTelemetry } = await import("./index");
      const summaryMap = new Map<AlgorithmType, StatisticalSummary>([
        [
          "energyAware",
          {
            algorithm: "energyAware",
            trials: 5,
            meanDistance: 10,
            stdDistance: 1,
            meanEnergy: 20,
            stdEnergy: 2,
            meanNodes: 50,
            stdNodes: 5,
            meanTimeMs: 1,
            stdTimeMs: 0.1,
            safetyRatePercent: 100,
          },
        ],
      ]);

      const artifacts = formatBenchmarkTelemetry({
        results: [dummyResult],
        summaryMap,
        trialsCount: 5,
      });

      expect(artifacts.length).toBeGreaterThanOrEqual(4);
      expect(artifacts.some((a) => a.id === "rawCsv")).toBe(true);
      expect(artifacts.some((a) => a.id === "table1Deterministic")).toBe(true);
      expect(artifacts.some((a) => a.id === "table2MonteCarlo")).toBe(true);
      expect(artifacts.some((a) => a.id === "summaryMd")).toBe(true);
    });
  });
});

