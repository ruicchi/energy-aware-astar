# 3D-Aware Standard Heuristics for Baseline Benchmark Comparison

Standard search policies (Manhattan, Euclidean, Chebyshev, Octile) now support a 3D-aware mode that accumulates true spatial step distance $\sqrt{d_{2D}^2 + \Delta z^2}$, incorporates elevation in heuristic estimates, and enforces vehicle slope traversability limits. This enables a scientifically valid comparison in thesis evaluations by benchmarking Energy-Aware A* against a true 3D spatial shortest-path baseline rather than an unconstrained 2D planar baseline that fails on elevated terrain.

## Considered Options

- **2D Planar Distance (Original)**: Standard heuristics evaluate only planar grid coordinates, ignoring elevation and slope limits. Rejected as an unfair comparison because classical algorithms attempt physically impossible vertical cliff climbs that fail post-evaluation safety checks.
- **3D Heuristic with 2D Step Cost**: Elevation accounted for only in $h(n)$ without changing transition cost $g(n)$. Rejected because it violates A* heuristic admissibility ($h(n) \le c(n, \text{goal})$).
- **3D Spatial Shortest Path with Slope Constraints (Accepted)**: Edge costs accumulate 3D Euclidean step lengths, heuristics evaluate 3D spatial metrics, and impassable slopes exceeding `maxTraversableSlope` are pruned during search. This provides a fair, distance-optimal baseline on real 3D terrain.

## Consequences

- The planning control panel (`PlanningControls`) includes an interactive toggle button below the heuristic selector to switch standard algorithms between 2D and 3D modes.
- Benchmark suites and reporters can run and compare Energy-Aware A* against both 2D planar and 3D terrain-constrained standard baselines.
