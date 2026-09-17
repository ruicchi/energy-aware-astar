import type { AlgorithmType, EnergyBreakdown } from "../../shared/types";
import type { StatisticalSummary } from "../statisticalAnalysis";

export interface AlgorithmBenchmarkResult {
  scenarioName: string;
  algorithm: AlgorithmType;
  pathFound: boolean;
  pathLength: number;
  totalDistance: number;
  totalEnergy: number;
  nodesExpanded: number;
  nodesGenerated: number;
  nodesEvaluated: number;
  executionTimeMs: number;
  isSafe: boolean;
  safetyFailureReason?: string;
  maxSlope: number;
  energyBreakdown: EnergyBreakdown;
  use3DStandard?: boolean;
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
 * A discrete, self-describing publication artifact produced by a BenchmarkReporter adapter.
 */
export interface BenchmarkArtifact {
  id: string;
  relativePath: string;
  content: string;
}

/**
 * Unified telemetry payload emitted by BenchmarkEngine across deterministic and Monte Carlo suites.
 */
export interface BenchmarkTelemetry {
  results: AlgorithmBenchmarkResult[];
  summaryMap?: Map<AlgorithmType, StatisticalSummary>;
  trialsCount?: number;
}

/**
 * Polymorphic presentation adapter seam for benchmark reporting.
 * Decouples experiment execution from serialization formats (CSV, LaTeX, Markdown, etc.).
 */
export interface BenchmarkReporter {
  readonly id: string;
  format(telemetry: BenchmarkTelemetry): BenchmarkArtifact[];
}
