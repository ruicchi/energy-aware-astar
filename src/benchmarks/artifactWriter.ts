import * as fs from "node:fs";
import * as path from "node:path";

export interface BenchmarkArtifactBundle {
  rawCsv?: string;
  table1DeterministicTex?: string;
  table2MonteCarloTex?: string;
  table3EnergyBreakdownTex?: string;
  summaryMd?: string;
}

export interface WrittenArtifactPaths {
  csvPath?: string;
  table1Path?: string;
  table2Path?: string;
  table3Path?: string;
  summaryMdPath?: string;
}

/**
 * Persists benchmark artifacts (CSV, LaTeX tables, Markdown summary) to disk.
 */
export function writeBenchmarkArtifacts(
  outputDir: string,
  bundle: BenchmarkArtifactBundle,
): WrittenArtifactPaths {
  const tableDir = path.join(outputDir, "thesis_tables");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(tableDir)) fs.mkdirSync(tableDir, { recursive: true });

  const written: WrittenArtifactPaths = {};

  if (bundle.rawCsv !== undefined) {
    const csvPath = path.join(outputDir, "benchmark_raw.csv");
    fs.writeFileSync(csvPath, bundle.rawCsv, "utf-8");
    written.csvPath = csvPath;
  }

  if (bundle.table1DeterministicTex !== undefined) {
    const table1Path = path.join(tableDir, "table1_deterministic.tex");
    fs.writeFileSync(table1Path, bundle.table1DeterministicTex, "utf-8");
    written.table1Path = table1Path;
  }

  if (bundle.table2MonteCarloTex !== undefined) {
    const table2Path = path.join(tableDir, "table2_montecarlo.tex");
    fs.writeFileSync(table2Path, bundle.table2MonteCarloTex, "utf-8");
    written.table2Path = table2Path;
  }

  if (bundle.table3EnergyBreakdownTex !== undefined) {
    const table3Path = path.join(tableDir, "table3_energy_breakdown.tex");
    fs.writeFileSync(table3Path, bundle.table3EnergyBreakdownTex, "utf-8");
    written.table3Path = table3Path;
  }

  if (bundle.summaryMd !== undefined) {
    const summaryMdPath = path.join(outputDir, "benchmark_summary.md");
    fs.writeFileSync(summaryMdPath, bundle.summaryMd, "utf-8");
    written.summaryMdPath = summaryMdPath;
  }

  return written;
}
