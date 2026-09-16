import { findPath } from "../algorithms/astar";
import { evaluatePathSafety } from "../physics/terrainPhysics";
import type { Scenario, AlgorithmType, EnergyBreakdown } from "../shared/types";
import {
  flatTerrainScenario,
  elevatedTerrainScenario,
  frictionTerrainScenario,
  mixedTerrainScenario,
  generateProceduralScenario,
} from "../data";
import {
  analyzeMonteCarloResults,
  type StatisticalSummary,
} from "./statisticalAnalysis";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  type BenchmarkArtifact,
  type BenchmarkTelemetry,
  type BenchmarkReporter,
  DEFAULT_REPORTERS,
  formatBenchmarkTelemetry,
  exportToCsv,
  generateDeterministicLatexTable,
  generateMonteCarloLatexTable,
  generateEnergyBreakdownLatexTable,
  generateMarkdownSummary,
} from "./reporters";

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
 * File system abstraction seam allowing benchmark artifact emission
 * to run against disk or in-memory virtual file systems.
 */
export interface ArtifactFileSystem {
  mkdirSync: (dir: string, options?: { recursive?: boolean }) => void;
  writeFileSync: (filePath: string, content: string, encoding: string) => void;
  existsSync: (dir: string) => boolean;
}

export const defaultFileSystem: ArtifactFileSystem = {
  mkdirSync: (dir, opts) => fs.mkdirSync(dir, opts),
  writeFileSync: (file, content, encoding) => fs.writeFileSync(file, content, encoding as BufferEncoding),
  existsSync: (dir) => fs.existsSync(dir),
};

/**
 * Persists an array of benchmark publication artifacts to disk using an ArtifactFileSystem adapter.
 */
export function publishArtifacts(
  outputDir: string,
  artifacts: BenchmarkArtifact[],
  fileSystem: ArtifactFileSystem = defaultFileSystem,
): WrittenArtifactPaths {
  const written: WrittenArtifactPaths = {};

  for (const artifact of artifacts) {
    const fullPath = path.join(outputDir, artifact.relativePath);
    const parentDir = path.dirname(fullPath);
    if (!fileSystem.existsSync(parentDir)) {
      fileSystem.mkdirSync(parentDir, { recursive: true });
    }
    fileSystem.writeFileSync(fullPath, artifact.content, "utf-8");

    if (artifact.id === "rawCsv" || artifact.relativePath.endsWith(".csv")) {
      written.csvPath = fullPath;
    } else if (artifact.id === "table1Deterministic" || artifact.relativePath.includes("table1")) {
      written.table1Path = fullPath;
    } else if (artifact.id === "table2MonteCarlo" || artifact.relativePath.includes("table2")) {
      written.table2Path = fullPath;
    } else if (artifact.id === "table3EnergyBreakdown" || artifact.relativePath.includes("table3")) {
      written.table3Path = fullPath;
    } else if (artifact.id === "summaryMd" || artifact.relativePath.endsWith(".md")) {
      written.summaryMdPath = fullPath;
    }
  }

  return written;
}

/**
 * Persists an in-memory benchmark artifact bundle using a filesystem adapter seam.
 */
export function saveArtifactBundle(
  outputDir: string,
  bundle: BenchmarkArtifactBundle,
  fileSystem: ArtifactFileSystem = defaultFileSystem,
): WrittenArtifactPaths {
  const artifacts: BenchmarkArtifact[] = [];

  if (bundle.rawCsv !== undefined) {
    artifacts.push({ id: "rawCsv", relativePath: "benchmark_raw.csv", content: bundle.rawCsv });
  }
  if (bundle.table1DeterministicTex !== undefined) {
    artifacts.push({
      id: "table1Deterministic",
      relativePath: "thesis_tables/table1_deterministic.tex",
      content: bundle.table1DeterministicTex,
    });
  }
  if (bundle.table2MonteCarloTex !== undefined) {
    artifacts.push({
      id: "table2MonteCarlo",
      relativePath: "thesis_tables/table2_montecarlo.tex",
      content: bundle.table2MonteCarloTex,
    });
  }
  if (bundle.table3EnergyBreakdownTex !== undefined) {
    artifacts.push({
      id: "table3EnergyBreakdown",
      relativePath: "thesis_tables/table3_energy_breakdown.tex",
      content: bundle.table3EnergyBreakdownTex,
    });
  }
  if (bundle.summaryMd !== undefined) {
    artifacts.push({ id: "summaryMd", relativePath: "benchmark_summary.md", content: bundle.summaryMd });
  }

  return publishArtifacts(outputDir, artifacts, fileSystem);
}

export const writeBenchmarkArtifacts = saveArtifactBundle;

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

export interface NamedScenario {
  name: string;
  scenario: Scenario;
}

/**
 * Returns the default deterministic benchmark scenarios (Case Studies 1 to 4).
 */
export function getDefaultDeterministicScenarios(): NamedScenario[] {
  return [
    { name: "Flat Terrain (Obstacles)", scenario: flatTerrainScenario },
    { name: "Steep Ridge (Elevation)", scenario: elevatedTerrainScenario },
    { name: "Mud & Water (Friction)", scenario: frictionTerrainScenario },
    { name: "Mixed Complex Environment", scenario: mixedTerrainScenario },
  ];
}

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
 * Runs all algorithms on a single scenario.
 */
export function runScenarioSuite(
  scenarioName: string,
  scenario: Scenario,
  algorithms: AlgorithmType[] = ALGORITHMS,
): AlgorithmBenchmarkResult[] {
  return algorithms.map((algo) => runAlgorithmBenchmark(scenarioName, scenario, algo));
}

export interface DeterministicBenchmarkOptions {
  algorithms?: AlgorithmType[];
  outputDir?: string;
  reporters?: readonly BenchmarkReporter[];
}

export interface DeterministicBenchmarkReport {
  results: AlgorithmBenchmarkResult[];
  csv: string;
  latexTable: string;
  energyBreakdownLatexTable: string;
  artifacts: BenchmarkArtifact[];
  writtenFiles?: WrittenArtifactPaths;
  getBundle: () => BenchmarkArtifactBundle;
  saveToDisk: (outputDir: string, fileSystem?: ArtifactFileSystem) => WrittenArtifactPaths;
  writeArtifacts: (outputDir: string, fileSystem?: ArtifactFileSystem) => WrittenArtifactPaths;
}

/**
 * Runs deterministic case study benchmarks, producing publication tables and CSV outputs.
 */
export function runDeterministicBenchmarkSuite(
  scenarios: NamedScenario[] = getDefaultDeterministicScenarios(),
  options: DeterministicBenchmarkOptions = {},
): DeterministicBenchmarkReport {
  const algorithms = options.algorithms ?? ALGORITHMS;
  const results: AlgorithmBenchmarkResult[] = [];

  for (const { name, scenario } of scenarios) {
    for (const algo of algorithms) {
      results.push(runAlgorithmBenchmark(name, scenario, algo));
    }
  }

  const telemetry: BenchmarkTelemetry = { results };
  const reporters = options.reporters ?? DEFAULT_REPORTERS;
  const artifacts = formatBenchmarkTelemetry(telemetry, reporters);

  const csv = artifacts.find((a) => a.id === "rawCsv")?.content ?? exportToCsv(results);
  const latexTable =
    artifacts.find((a) => a.id === "table1Deterministic")?.content ??
    generateDeterministicLatexTable(results);
  const energyBreakdownLatexTable =
    artifacts.find((a) => a.id === "table3EnergyBreakdown")?.content ??
    generateEnergyBreakdownLatexTable(results);

  const getBundle = (): BenchmarkArtifactBundle => ({
    table1DeterministicTex: latexTable,
    table3EnergyBreakdownTex: energyBreakdownLatexTable,
  });

  const saveToDisk = (dir: string, fileSystem?: ArtifactFileSystem) =>
    publishArtifacts(dir, artifacts, fileSystem);

  const writeArtifacts = saveToDisk;
  const writtenFiles = options.outputDir ? saveToDisk(options.outputDir) : undefined;

  return {
    results,
    csv,
    latexTable,
    energyBreakdownLatexTable,
    artifacts,
    writtenFiles,
    getBundle,
    saveToDisk,
    writeArtifacts,
  };
}

export interface MonteCarloBenchmarkOptions {
  trials?: number;
  rows?: number;
  cols?: number;
  numHills?: number;
  numMudPatches?: number;
  obstacleDensity?: number;
  seedStart?: number;
  algorithms?: AlgorithmType[];
  outputDir?: string;
  reporters?: readonly BenchmarkReporter[];
}

export interface MonteCarloBenchmarkReport {
  results: AlgorithmBenchmarkResult[];
  summaryMap: Map<AlgorithmType, StatisticalSummary>;
  csv: string;
  latexTable: string;
  markdownSummary: string;
  artifacts: BenchmarkArtifact[];
  writtenFiles?: WrittenArtifactPaths;
  getBundle: () => BenchmarkArtifactBundle;
  saveToDisk: (outputDir: string, fileSystem?: ArtifactFileSystem) => WrittenArtifactPaths;
  writeArtifacts: (outputDir: string, fileSystem?: ArtifactFileSystem) => WrittenArtifactPaths;
}

/**
 * Executes a Monte Carlo trial suite over procedural randomized terrains,
 * conducting statistical aggregation, paired t-tests, and emitting artifacts.
 */
export function runMonteCarloBenchmarkSuite(
  options: MonteCarloBenchmarkOptions = {},
): MonteCarloBenchmarkReport {
  const trials = options.trials ?? 50;
  const rows = options.rows ?? 25;
  const cols = options.cols ?? 25;
  const numHills = options.numHills ?? 3;
  const numMudPatches = options.numMudPatches ?? 3;
  const obstacleDensity = options.obstacleDensity ?? 0.08;
  const seedStart = options.seedStart ?? 1;
  const algorithms = options.algorithms ?? ALGORITHMS;

  const results: AlgorithmBenchmarkResult[] = [];

  for (let i = 0; i < trials; i++) {
    const seed = seedStart + i;
    const scenario = generateProceduralScenario({
      seed,
      rows,
      cols,
      numHills,
      numMudPatches,
      obstacleDensity,
    });
    for (const algo of algorithms) {
      results.push(runAlgorithmBenchmark(`Seed_${seed}`, scenario, algo));
    }
  }

  const summaryMap = analyzeMonteCarloResults(results);
  const telemetry: BenchmarkTelemetry = { results, summaryMap, trialsCount: trials };
  const reporters = options.reporters ?? DEFAULT_REPORTERS;
  const artifacts = formatBenchmarkTelemetry(telemetry, reporters);

  const csv = artifacts.find((a) => a.id === "rawCsv")?.content ?? exportToCsv(results);
  const latexTable =
    artifacts.find((a) => a.id === "table2MonteCarlo")?.content ??
    generateMonteCarloLatexTable(summaryMap);
  const markdownSummary =
    artifacts.find((a) => a.id === "summaryMd")?.content ??
    generateMarkdownSummary(summaryMap, trials);

  const getBundle = (): BenchmarkArtifactBundle => ({
    rawCsv: csv,
    table2MonteCarloTex: latexTable,
    summaryMd: markdownSummary,
  });

  const saveToDisk = (dir: string, fileSystem?: ArtifactFileSystem) =>
    publishArtifacts(dir, artifacts, fileSystem);

  const writeArtifacts = saveToDisk;
  const writtenFiles = options.outputDir ? saveToDisk(options.outputDir) : undefined;

  return {
    results,
    summaryMap,
    csv,
    latexTable,
    markdownSummary,
    artifacts,
    writtenFiles,
    getBundle,
    saveToDisk,
    writeArtifacts,
  };
}

export interface ComprehensiveBenchmarkOptions {
  deterministic?: boolean | NamedScenario[];
  monteCarlo?: boolean | MonteCarloBenchmarkOptions;
  outputDir?: string;
  reporters?: readonly BenchmarkReporter[];
}

export interface ComprehensiveBenchmarkReport {
  deterministicReport?: DeterministicBenchmarkReport;
  monteCarloReport?: MonteCarloBenchmarkReport;
  allResults: AlgorithmBenchmarkResult[];
  allCsv: string;
  artifacts: BenchmarkArtifact[];
  writtenFiles?: WrittenArtifactPaths;
  getBundle: () => BenchmarkArtifactBundle;
  saveToDisk: (outputDir: string, fileSystem?: ArtifactFileSystem) => WrittenArtifactPaths;
  writeArtifacts: (outputDir: string, fileSystem?: ArtifactFileSystem) => WrittenArtifactPaths;
}

/**
 * Executes an autonomous end-to-end experiment pipeline spanning deterministic case studies,
 * procedural Monte Carlo trials, paired statistical hypothesis testing, and artifact emission.
 */
export function runBenchmarkExperiment(
  options: ComprehensiveBenchmarkOptions = { deterministic: true, monteCarlo: true },
): ComprehensiveBenchmarkReport {
  const reporters = options.reporters ?? DEFAULT_REPORTERS;

  let deterministicReport: DeterministicBenchmarkReport | undefined;
  if (options.deterministic !== false) {
    const scenarios = Array.isArray(options.deterministic)
      ? options.deterministic
      : getDefaultDeterministicScenarios();
    deterministicReport = runDeterministicBenchmarkSuite(scenarios, { reporters });
  }

  let monteCarloReport: MonteCarloBenchmarkReport | undefined;
  if (options.monteCarlo !== false) {
    const mcOpts = typeof options.monteCarlo === "object" ? options.monteCarlo : {};
    monteCarloReport = runMonteCarloBenchmarkSuite({ ...mcOpts, reporters });
  }

  const allResults = [
    ...(deterministicReport?.results ?? []),
    ...(monteCarloReport?.results ?? []),
  ];

  const telemetry: BenchmarkTelemetry = {
    results: allResults,
    summaryMap: monteCarloReport?.summaryMap,
    trialsCount: typeof options.monteCarlo === "object" ? options.monteCarlo.trials : undefined,
  };

  const artifacts = formatBenchmarkTelemetry(telemetry, reporters);
  const allCsv = artifacts.find((a) => a.id === "rawCsv")?.content ?? exportToCsv(allResults);

  const getBundle = (): BenchmarkArtifactBundle => ({
    rawCsv: monteCarloReport?.csv ?? allCsv,
    table1DeterministicTex: deterministicReport?.latexTable,
    table2MonteCarloTex: monteCarloReport?.latexTable,
    table3EnergyBreakdownTex: deterministicReport?.energyBreakdownLatexTable,
    summaryMd: monteCarloReport?.markdownSummary,
  });

  const saveToDisk = (dir: string, fileSystem?: ArtifactFileSystem) =>
    publishArtifacts(dir, artifacts, fileSystem);

  const writeArtifacts = saveToDisk;
  const writtenFiles = options.outputDir ? saveToDisk(options.outputDir) : undefined;

  return {
    deterministicReport,
    monteCarloReport,
    allResults,
    allCsv,
    artifacts,
    writtenFiles,
    getBundle,
    saveToDisk,
    writeArtifacts,
  };
}

// Re-export statistical analysis and publication reporters
export {
  calcStats,
  standardNormalCdf,
  calculatePairedTTest,
  analyzeMonteCarloResults,
  type StatisticalSummary,
} from "./statisticalAnalysis";

export * from "./reporters";
