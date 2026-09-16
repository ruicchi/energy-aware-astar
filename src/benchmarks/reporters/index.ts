export * from "./reporterTypes";
export * from "./csvReporter";
export * from "./latexReporter";
export * from "./markdownReporter";

import { CsvReporter } from "./csvReporter";
import { LatexReporter } from "./latexReporter";
import { MarkdownReporter } from "./markdownReporter";
import type { BenchmarkReporter, BenchmarkTelemetry, BenchmarkArtifact } from "./reporterTypes";

export const DEFAULT_REPORTERS: readonly BenchmarkReporter[] = [
  new CsvReporter(),
  new LatexReporter(),
  new MarkdownReporter(),
];

/**
 * Executes registered presentation adapters across a benchmark telemetry record,
 * returning the consolidated publication artifact set.
 */
export function formatBenchmarkTelemetry(
  telemetry: BenchmarkTelemetry,
  reporters: readonly BenchmarkReporter[] = DEFAULT_REPORTERS,
): BenchmarkArtifact[] {
  return reporters.flatMap((reporter) => reporter.format(telemetry));
}
