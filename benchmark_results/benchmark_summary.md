# Chapter 4: Simulation Results & Discussion Summary

Evaluated **50** randomly generated procedural terrains ($25 \times 25$ grids) comparing **Energy-Aware A*** with four standard A* heuristics (**Manhattan, Euclidean, Octile, Chebyshev**).

## Statistical Performance Table

| Algorithm | Mean Distance (m) | Mean Energy (J) | Energy Reduction (%) | Nodes Evaluated | Safety Rate (%) | $p$-value |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Energy-Aware A*** | 38.06 ± 2.82 | 42.36 ± 3.19 | **Baseline** | 1655 ± 340 | **100.0%** | -- |
| **Manhattan A*** | 40.00 ± 0.00 | 261.18 ± 159.05 | **+83.8%** | 50 ± 9 | **18.0%** | < 0.001 |
| **Euclidean A*** | 30.12 ± 0.75 | 291.72 ± 167.12 | **+85.5%** | 127 ± 53 | **4.0%** | < 0.001 |
| **Octile A*** | 30.12 ± 0.75 | 304.60 ± 177.23 | **+86.1%** | 99 ± 36 | **4.0%** | < 0.001 |
| **Chebyshev A*** | 30.12 ± 0.75 | 303.34 ± 173.34 | **+86.0%** | 247 ± 23 | **4.0%** | < 0.001 |

## Key Thesis Findings

1. **Significant Energy Conservation:** Energy-Aware A* reduced total energy consumption by **85.5%** compared to Euclidean A* and **83.8%** compared to Manhattan A* ($p < 0.001$).
2. **Topographic Traversability & Rollover Prevention:** Energy-Aware A* achieved a **100.0%** safe traversal rate, whereas standard Euclidean A* exhibited a failure rate of **96.0%** due to attempting direct climbs on slopes exceeding the robot's tipping threshold.
3. **Spatial vs. Energetic Trade-off:** Energy-Aware paths were on average **26.4%** longer in Euclidean distance, successfully trading minimal spatial deviation for substantial energy savings and rollover avoidance.
4. **Search Complexity:** Expanding into the $(x, y, \theta)$ state space required evaluating **1655** nodes compared to **127** for Euclidean A*, representing an acceptable computational overhead for offline mission planning.
