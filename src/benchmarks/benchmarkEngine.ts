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
import { exportToCsv } from "./reporters/csvReporter";
import {
  generateDeterministicLatexTable,
  generateMonteCarloLatexTable,
  generateEnergyBreakdownLatexTable,
} from "./reporters/latexReporter";
import * as fs from "node:fs";
import * as path from "node:path";
import { generateMarkdownSummary } from "./reporters/markdownReporter";

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
 * Persists an in-memory benchmark artifact bundle using a filesystem adapter seam.
 */
export function saveArtifactBundle(
  outputDir: string,
  bundle: BenchmarkArtifactBundle,
  fileSystem: ArtifactFileSystem = defaultFileSystem,
): WrittenArtifactPaths {
  const tableDir = path.join(outputDir, "thesis_tables");
  if (!fileSystem.existsSync(outputDir)) fileSystem.mkdirSync(outputDir, { recursive: true });
  if (!fileSystem.existsSync(tableDir)) fileSystem.mkdirSync(tableDir, { recursive: true });

  const written: WrittenArtifactPaths = {};

  if (bundle.rawCsv !== undefined) {
    const csvPath = path.join(outputDir, "benchmark_raw.csv");
    fileSystem.writeFileSync(csvPath, bundle.rawCsv, "utf-8");
    written.csvPath = csvPath;
  }

  if (bundle.table1DeterministicTex !== undefined) {
    const table1Path = path.join(tableDir, "table1_deterministic.tex");
    fileSystem.writeFileSync(table1Path, bundle.table1DeterministicTex, "utf-8");
    written.table1Path = table1Path;
  }

  if (bundle.table2MonteCarloTex !== undefined) {
    const table2Path = path.join(tableDir, "table2_montecarlo.tex");
    fileSystem.writeFileSync(table2Path, bundle.table2MonteCarloTex, "utf-8");
    written.table2Path = table2Path;
  }

  if (bundle.table3EnergyBreakdownTex !== undefined) {
    const table3Path = path.join(tableDir, "table3_energy_breakdown.tex");
    fileSystem.writeFileSync(table3Path, bundle.table3EnergyBreakdownTex, "utf-8");
    written.table3Path = table3Path;
  }

  if (bundle.summaryMd !== undefined) {
    const summaryMdPath = path.join(outputDir, "benchmark_summary.md");
    fileSystem.writeFileSync(summaryMdPath, bundle.summaryMd, "utf-8");
    written.summaryMdPath = summaryMdPath;
  }

  return written;
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
}

export interface DeterministicBenchmarkReport {
  results: AlgorithmBenchmarkResult[];
  csv: string;
  latexTable: string;
  energyBreakdownLatexTable: string;
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

  const csv = exportToCsv(results);
  const latexTable = generateDeterministicLatexTable(results);
  const energyBreakdownLatexTable = generateEnergyBreakdownLatexTable(results);

  const getBundle = (): BenchmarkArtifactBundle => ({
    table1DeterministicTex: latexTable,
    table3EnergyBreakdownTex: energyBreakdownLatexTable,
  });

  const saveToDisk = (dir: string, fileSystem?: ArtifactFileSystem) =>
    saveArtifactBundle(dir, getBundle(), fileSystem);

  const writeArtifacts = saveToDisk;
  const writtenFiles = options.outputDir ? saveToDisk(options.outputDir) : undefined;

  return {
    results,
    csv,
    latexTable,
    energyBreakdownLatexTable,
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
}

export interface MonteCarloBenchmarkReport {
  results: AlgorithmBenchmarkResult[];
  summaryMap: Map<AlgorithmType, StatisticalSummary>;
  csv: string;
  latexTable: string;
  markdownSummary: string;
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
  const csv = exportToCsv(results);
  const latexTable = generateMonteCarloLatexTable(summaryMap);
  const markdownSummary = generateMarkdownSummary(summaryMap, trials);

  const getBundle = (): BenchmarkArtifactBundle => ({
    rawCsv: csv,
    table2MonteCarloTex: latexTable,
    summaryMd: markdownSummary,
  });

  const saveToDisk = (dir: string, fileSystem?: ArtifactFileSystem) =>
    saveArtifactBundle(dir, getBundle(), fileSystem);

  const writeArtifacts = saveToDisk;
  const writtenFiles = options.outputDir ? saveToDisk(options.outputDir) : undefined;

  return {
    results,
    summaryMap,
    csv,
    latexTable,
    markdownSummary,
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
}

export interface ComprehensiveBenchmarkReport {
  deterministicReport?: DeterministicBenchmarkReport;
  monteCarloReport?: MonteCarloBenchmarkReport;
  allResults: AlgorithmBenchmarkResult[];
  allCsv: string;
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
  let deterministicReport: DeterministicBenchmarkReport | undefined;
  if (options.deterministic !== false) {
    const scenarios = Array.isArray(options.deterministic)
      ? options.deterministic
      : getDefaultDeterministicScenarios();
    deterministicReport = runDeterministicBenchmarkSuite(scenarios);
  }

  let monteCarloReport: MonteCarloBenchmarkReport | undefined;
  if (options.monteCarlo !== false) {
    const mcOpts = typeof options.monteCarlo === "object" ? options.monteCarlo : {};
    monteCarloReport = runMonteCarloBenchmarkSuite(mcOpts);
  }

  const allResults = [
    ...(deterministicReport?.results ?? []),
    ...(monteCarloReport?.results ?? []),
  ];
  const allCsv = exportToCsv(allResults);

  const getBundle = (): BenchmarkArtifactBundle => ({
    rawCsv: monteCarloReport?.csv ?? allCsv,
    table1DeterministicTex: deterministicReport?.latexTable,
    table2MonteCarloTex: monteCarloReport?.latexTable,
    table3EnergyBreakdownTex: deterministicReport?.energyBreakdownLatexTable,
    summaryMd: monteCarloReport?.markdownSummary,
  });

  const saveToDisk = (dir: string, fileSystem?: ArtifactFileSystem) =>
    saveArtifactBundle(dir, getBundle(), fileSystem);

  const writeArtifacts = saveToDisk;
  const writtenFiles = options.outputDir ? saveToDisk(options.outputDir) : undefined;

  return {
    deterministicReport,
    monteCarloReport,
    allResults,
    allCsv,
    writtenFiles,
    getBundle,
    saveToDisk,
    writeArtifacts,
  };
}

// Re-export statistical analysis and publication reporters for backwards compatibility
export {
  calcStats,
  standardNormalCdf,
  calculatePairedTTest,
  analyzeMonteCarloResults,
  type StatisticalSummary,
} from "./statisticalAnalysis";

export { exportToCsv } from "./reporters/csvReporter";
export {
  generateDeterministicLatexTable,
  generateMonteCarloLatexTable,
  generateEnergyBreakdownLatexTable,
} from "./reporters/latexReporter";
export { generateMarkdownSummary } from "./reporters/markdownReporter";
