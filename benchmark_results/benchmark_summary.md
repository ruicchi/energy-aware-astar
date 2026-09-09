# Chapter 4: Simulation Results & Discussion Summary

Evaluated **50** randomly generated procedural terrains ($25 \times 25$ grids) comparing **Energy-Aware A*** with four standard A* heuristics (**Manhattan, Euclidean, Octile, Chebyshev**).

## Statistical Performance Table

| Algorithm | Mean Distance (m) | Mean Energy (J) | Energy Reduction (%) | Nodes Evaluated | Safety Rate (%) | $p$-value |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Energy-Aware A*** | 38.11 ± 2.80 | 41.36 ± 2.83 | **Baseline** | 1677 ± 350 | **100.0%** | -- |
| **Manhattan A*** | 40.00 ± 0.00 | 260.40 ± 159.05 | **+84.1%** | 50 ± 9 | **18.0%** | < 0.001 |
| **Euclidean A*** | 30.12 ± 0.75 | 291.72 ± 167.12 | **+85.8%** | 127 ± 53 | **4.0%** | < 0.001 |
| **Octile A*** | 30.12 ± 0.75 | 304.60 ± 177.23 | **+86.4%** | 99 ± 36 | **4.0%** | < 0.001 |
| **Chebyshev A*** | 30.12 ± 0.75 | 303.34 ± 173.34 | **+86.4%** | 247 ± 23 | **4.0%** | < 0.001 |

## Key Thesis Findings

1. **Significant Energy Conservation:** Energy-Aware A* reduced total energy consumption by **85.8%** compared to Euclidean A* and **84.1%** compared to Manhattan A* ($p < 0.001$).
2. **Topographic Traversability & Rollover Prevention:** Energy-Aware A* achieved a **100.0%** safe traversal rate, whereas standard Euclidean A* exhibited a failure rate of **96.0%** due to attempting direct climbs on slopes exceeding the robot's tipping threshold.
3. **Spatial vs. Energetic Trade-off:** Energy-Aware paths were on average **26.5%** longer in Euclidean distance, successfully trading minimal spatial deviation for substantial energy savings and rollover avoidance.
4. **Search Complexity:** Expanding into the $(x, y, \theta)$ state space required evaluating **1677** nodes compared to **127** for Euclidean A*, representing an acceptable computational overhead for offline mission planning.
