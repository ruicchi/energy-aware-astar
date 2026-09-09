import type { AlgorithmType } from "../../shared/types";
import { ALGORITHMS, ALGORITHM_LABELS, type AlgorithmBenchmarkResult } from "../benchmarkEngine";
import type { StatisticalSummary } from "../statisticalAnalysis";

/**
 * Formats deterministic case studies into a LaTeX booktabs table for Chapter 4.
 */
export const generateDeterministicLatexTable = (
  results: AlgorithmBenchmarkResult[],
): string => {
  let latex = `\\begin{table*}[t]
\\centering
\\caption{Performance Comparison of Path-Planning Algorithms across Deterministic Benchmark Scenarios}
\\label{tab:deterministic_benchmarks}
\\begin{tabular}{llcccccc}
\\toprule
\\textbf{Scenario} & \\textbf{Algorithm} & \\textbf{Distance (m)} & \\textbf{Energy (J)} & \\textbf{Climbing (J)} & \\textbf{Turning (J)} & \\textbf{Nodes Evaluated} & \\textbf{Safe?} \\\\
\\midrule\n`;

  const scenarios = Array.from(new Set(results.map((r) => r.scenarioName)));

  scenarios.forEach((scen, scenIdx) => {
    const scenResults = results.filter((r) => r.scenarioName === scen);
    scenResults.forEach((r, idx) => {
      const isFirst = idx === 0;
      const scenLabel = isFirst ? `\\multirow{5}{*}{\\textbf{${scen}}}` : "";
      const algoLabel = ALGORITHM_LABELS[r.algorithm];
      const safeLabel = r.isSafe ? "\\checkmark" : "\\texttimes";
      latex += `${scenLabel} & ${algoLabel} & ${r.totalDistance.toFixed(2)} & ${r.totalEnergy.toFixed(2)} & ${r.energyBreakdown.climbingCost.toFixed(2)} & ${r.energyBreakdown.turnCost.toFixed(2)} & ${r.nodesEvaluated} & ${safeLabel} \\\\\n`;
    });
    if (scenIdx < scenarios.length - 1) {
      latex += `\\midrule\n`;
    }
  });

  latex += `\\bottomrule
\\end{tabular}
\\end{table*}`;

  return latex;
};

/**
 * Formats Monte Carlo statistical summary into a LaTeX table for Chapter 4.
 */
export const generateMonteCarloLatexTable = (
  summaryMap: Map<AlgorithmType, StatisticalSummary>,
): string => {
  let latex = `\\begin{table*}[t]
\\centering
\\caption{Monte Carlo Statistical Evaluation ($N = 50$ Random Topographic Trials)}
\\label{tab:monte_carlo_results}
\\begin{tabular}{lcccccr}
\\toprule
\\textbf{Algorithm} & \\textbf{Distance (m)} & \\textbf{Total Energy (J)} & \\textbf{Energy Reduction (\\%)} & \\textbf{Nodes Evaluated} & \\textbf{Safety Rate (\\%)} & \\textbf{$p$-value} \\\\
\\midrule\n`;

  for (const algo of ALGORITHMS) {
    const s = summaryMap.get(algo);
    if (!s) continue;
    const label = ALGORITHM_LABELS[algo];
    const distStr = `${s.meanDistance.toFixed(2)} \\pm ${s.stdDistance.toFixed(2)}`;
    const energyStr = `${s.meanEnergy.toFixed(2)} \\pm ${s.stdEnergy.toFixed(2)}`;
    const nodesStr = `${Math.round(s.meanNodes)} \\pm ${Math.round(s.stdNodes)}`;
    const reductionStr =
      s.energySavingsPercentVsEA !== undefined
        ? `+${s.energySavingsPercentVsEA.toFixed(1)}\\%`
        : "-- (Baseline)";
    const safetyStr = `${s.safetyRatePercent.toFixed(1)}\\%`;
    const pStr =
      s.pValueVsEA !== undefined
        ? s.pValueVsEA < 0.001
          ? "$p < 0.001$"
          : `$p = ${s.pValueVsEA.toFixed(3)}$`
        : "--";

    latex += `${label} & ${distStr} & ${energyStr} & ${reductionStr} & ${nodesStr} & ${safetyStr} & ${pStr} \\\\\n`;
  }

  latex += `\\bottomrule
\\end{tabular}
\\end{table*}`;

  return latex;
};

/**
 * Generates an energy breakdown LaTeX table.
 */
export const generateEnergyBreakdownLatexTable = (
  results: AlgorithmBenchmarkResult[],
): string => {
  let latex = `\\begin{table*}[t]
\\centering
\\caption{Component-Wise Energy Breakdown across Tested Heuristics (Scenario: Mixed Terrain)}
\\label{tab:energy_breakdown}
\\begin{tabular}{lcccccc}
\\toprule
\\textbf{Algorithm} & \\textbf{Base (J)} & \\textbf{Climbing (J)} & \\textbf{Turning (J)} & \\textbf{Dirt (J)} & \\textbf{Water (J)} & \\textbf{Total (J)} \\\\
\\midrule\n`;

  const mixedResults = results.filter((r) => r.scenarioName.toLowerCase().includes("mixed"));
  const targetResults = mixedResults.length > 0 ? mixedResults : results.slice(0, 5);

  targetResults.forEach((r) => {
    const label = ALGORITHM_LABELS[r.algorithm];
    const b = r.energyBreakdown;
    latex += `${label} & ${b.baseMovement.toFixed(2)} & ${b.climbingCost.toFixed(2)} & ${b.turnCost.toFixed(2)} & ${b.dirtPenalty.toFixed(2)} & ${b.waterPenalty.toFixed(2)} & ${r.totalEnergy.toFixed(2)} \\\\\n`;
  });

  latex += `\\bottomrule
\\end{tabular}
\\end{table*}`;

  return latex;
};
