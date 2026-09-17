# Search Node Evaluation Metrics and State-Space Accounting

Standardizes search efficiency metrics across the pathfinding engine, benchmark suites, and user interface by distinguishing **Nodes Expanded** (popped $\text{SE}(2)$ states closed from the priority queue) from **Nodes Generated** (candidate successor states evaluated with $f(n) = g(n) + h(n)$ and queued on OPEN), while preserving `nodesEvaluated` as a backward-compatible alias.

## Context

Previously, the pathfinding engine tracked a single counter named `nodesEvaluated` which incremented when non-duplicate nodes were popped from `openSet`. This created several ambiguities:
1. In standard AI and search literature (Russell & Norvig, Sturtevant Moving AI benchmarks), nodes popped from OPEN are designated as **expanded**, whereas evaluation of $f(n)$ corresponds to **generated** successors.
2. Because vehicle turning costs penalize orientation changes, nodes in this graph represent directed $\text{SE}(2)$ poses $(r, c, \theta)$ rather than 2D planar cells $(r, c)$.
3. If search exhausted the open set without reaching the destination, the engine reset `nodesEvaluated` to 0, hiding search effort on failed or blocked runs.

## Considered Options

- **Single Ambiguous Counter (`nodesEvaluated`)**: Retain the existing name without generation tracking. Rejected because literature comparisons and thesis benchmark tables require rigorous differentiation between expansions and evaluations.
- **2D Planar Cell Counting**: Count unique grid coordinates $(r, c)$ rather than poses $(r, c, \theta)$. Rejected because turning and kinematic traversability depend on orientation, making $(r, c, \theta)$ the true state space of the algorithm.
- **Dual Industry-Standard Metrics with Backward Compatibility (Accepted)**:
  - `nodesExpanded`: Total state-space pose nodes $(r, c, \theta)$ popped from `openSet` and closed (including the goal pop upon termination).
  - `nodesGenerated`: Total state-space pose nodes evaluated with $f(n) = g(n) + h(n)$ and placed/relaxed in `openSet` (initialized to 1 for the start node).
  - `nodesEvaluated`: Aliased to `nodesExpanded` across type definitions and benchmark records to preserve backward compatibility.
  - Retain accumulated counts on search exhaustion rather than resetting to 0.

## Consequences

- [`EnergyBreakdown`](../../src/shared/types.ts) and [`AlgorithmBenchmarkResult`](../../src/benchmarks/reporters/reporterTypes.ts) expose `nodesExpanded`, `nodesGenerated`, and `nodesEvaluated`.
- Benchmark CSV and LaTeX reporters publish clear, academically rigorous metrics for thesis evaluations.
- Search exhaustion preserves and reports total search effort.
