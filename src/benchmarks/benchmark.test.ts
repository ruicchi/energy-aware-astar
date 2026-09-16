import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  runDeterministicBenchmarkSuite,
  runMonteCarloBenchmarkSuite,
  runBenchmarkExperiment,
  ALGORITHM_LABELS,
} from "./benchmarkEngine";

describe("Benchmark: Energy-Aware A* vs Standard Heuristics", () => {
  it("evaluates deterministic benchmark scenarios (Case Studies 1 to 4)", () => {
    const report = runDeterministicBenchmarkSuite();

    // Verify all runs found paths
    expect(report.results.length).toBe(20); // 4 scenarios * 5 algorithms
    const eaResults = report.results.filter((r) => r.algorithm === "energyAware");
    expect(eaResults.every((r) => r.pathFound)).toBe(true);
    expect(eaResults.every((r) => r.isSafe)).toBe(true);

    // Verify generated publication tables
    expect(report.latexTable).toContain("\\begin{table*}[t]");
    expect(report.latexTable).toContain("Deterministic Benchmark Scenarios");
    expect(report.energyBreakdownLatexTable).toContain("\\begin{table*}[t]");
    expect(report.energyBreakdownLatexTable).toContain("Component-Wise Energy Breakdown");

    console.log("\n=== Deterministic Benchmarks Completed ===");
    const scenarios = Array.from(new Set(report.results.map((r) => r.scenarioName)));
    for (const name of scenarios) {
      console.log(`\nScenario: ${name}`);
      const scenRes = report.results.filter((r) => r.scenarioName === name);
      scenRes.forEach((r) => {
        console.log(
          `  ${ALGORITHM_LABELS[r.algorithm].padEnd(16)} | Dist: ${r.totalDistance.toFixed(
            1,
          )}m | Energy: ${r.totalEnergy.toFixed(1)}J | Nodes: ${r.nodesEvaluated} | Safe: ${
            r.isSafe ? "YES" : "NO (" + r.safetyFailureReason + ")"
          }`,
        );
      });
    }
  });

  it("executes Monte Carlo batch simulation (N = 50 random seeds)", () => {
    const report = runMonteCarloBenchmarkSuite({ trials: 50 });

    expect(report.results.length).toBe(250);
    expect(report.summaryMap.size).toBe(5);

    const ea = report.summaryMap.get("energyAware")!;
    const euc = report.summaryMap.get("euclidean")!;
    const man = report.summaryMap.get("manhattan")!;

    expect(ea.safetyRatePercent).toBe(100);
    expect(euc.energySavingsPercentVsEA).toBeGreaterThan(80);
    expect(man.energySavingsPercentVsEA).toBeGreaterThan(80);

    // Verify generated report artifacts
    expect(report.csv).toContain("Scenario,Algorithm,PathFound");
    expect(report.latexTable).toContain("\\caption{Monte Carlo Statistical Evaluation");
    expect(report.markdownSummary).toContain("# Chapter 4: Simulation Results & Discussion Summary");
    expect(report.markdownSummary).toContain("## Statistical Performance Table");
    expect(report.markdownSummary).toContain("## Key Thesis Findings");

    console.log("\n=== Monte Carlo Summary (N = 50) ===");
    for (const [algo, s] of report.summaryMap.entries()) {
      const red = s.energySavingsPercentVsEA
        ? ` (Savings: +${s.energySavingsPercentVsEA.toFixed(1)}%)`
        : "";
      console.log(
        `  ${ALGORITHM_LABELS[algo].padEnd(16)} | Energy: ${s.meanEnergy.toFixed(1)} ± ${s.stdEnergy.toFixed(1)}J${red} | Safety: ${s.safetyRatePercent.toFixed(1)}%`,
      );
    }
  });

  it("executes autonomous end-to-end experiment pipeline and writes artifacts", () => {
    const tempDir = path.resolve(process.cwd(), "benchmark_results", ".test_tmp");
    try {
      const report = runBenchmarkExperiment({
        deterministic: true,
        monteCarlo: { trials: 3 }, // fast trial count for integration check
        outputDir: tempDir,
      });

      expect(report.deterministicReport).toBeDefined();
      expect(report.monteCarloReport).toBeDefined();
      expect(report.allResults.length).toBe(20 + 15);
      expect(report.writtenFiles).toBeDefined();
      expect(fs.existsSync(report.writtenFiles!.csvPath!)).toBe(true);
      expect(fs.existsSync(report.writtenFiles!.table1Path!)).toBe(true);
      expect(fs.existsSync(report.writtenFiles!.table2Path!)).toBe(true);
      expect(fs.existsSync(report.writtenFiles!.table3Path!)).toBe(true);
      expect(fs.existsSync(report.writtenFiles!.summaryMdPath!)).toBe(true);
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it("supports in-memory artifact retrieval and virtual filesystem adapter seam", () => {
    const report = runDeterministicBenchmarkSuite();
    const bundle = report.getBundle();

    expect(bundle.table1DeterministicTex).toBeDefined();
    expect(bundle.table1DeterministicTex).toContain("Deterministic Benchmark Scenarios");
    expect(bundle.table3EnergyBreakdownTex).toBeDefined();
    expect(bundle.table3EnergyBreakdownTex).toContain("Component-Wise Energy Breakdown");

    // In-memory virtual filesystem adapter (Ports & Adapters)
    const virtualFiles = new Map<string, string>();
    const virtualDirs = new Set<string>();

    const mockFs = {
      mkdirSync: (dir: string) => {
        virtualDirs.add(dir);
      },
      writeFileSync: (filePath: string, content: string) => {
        virtualFiles.set(filePath, content);
      },
      existsSync: (dir: string) => virtualDirs.has(dir),
    };

    const written = report.saveToDisk("/virtual/output", mockFs);
    expect(written.table1Path).toBe(path.join("/virtual/output", "thesis_tables", "table1_deterministic.tex"));
    expect(virtualFiles.has(written.table1Path!)).toBe(true);
    expect(virtualFiles.get(written.table1Path!)).toBe(bundle.table1DeterministicTex);
  });

  it("supports running 3D-aware standard heuristics in deterministic benchmark suite", () => {
    const report3D = runDeterministicBenchmarkSuite(undefined, { use3DStandard: true });
    expect(report3D.results.length).toBe(20);

    const euclideanResults = report3D.results.filter((r) => r.algorithm === "euclidean");
    expect(euclideanResults.every((r) => r.use3DStandard === true)).toBe(true);
    expect(report3D.latexTable).toContain("Euclidean A* (3D)");
  });
});
