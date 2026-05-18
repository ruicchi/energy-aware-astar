# Design: CoM-Aware Stability and Risk for Energy-Aware A*

Incorporate Santos et al. (2020) "Path Planning Aware of Robot’s Center of Mass for Steep Slope Vineyards" into the existing A* algorithm.

## Architecture

### 1. Robot Physics Model
Update `Scenario` interface in `src/types/index.ts` to include robot physical parameters:
- `trackWidth`: Distance between wheels (lateral).
- `wheelBase`: Distance between axles (longitudinal).
- `comHeight`: Height of Center of Mass (CoM) above ground.
- `stabilityMargin`: Minimum safe distance ($\epsilon$) from CoM projection to support polygon edge.

### 2. Posture Calculation
In `src/algorithms/utils.ts`, calculate roll ($\phi$) and pitch ($\theta$) based on terrain gradients and robot heading ($\psi$):
- $Z_x = \frac{\Delta Elevation}{\Delta x}$
- $Z_y = \frac{\Delta Elevation}{\Delta y}$
- $\theta = \arctan(Z_x \cos \psi + Z_y \sin \psi)$
- $\phi = \arctan(Z_y \cos \psi - Z_x \sin \psi)$

### 3. Stability Constraint
Implement `isStablePosture(row, col, heading, scenario)`:
- Project CoM onto ground plane using roll and pitch.
- Check if projection is within the rectangle defined by `trackWidth` and `wheelBase` plus `stabilityMargin`.
- If unstable, treat node as untraversable (obstacle).

### 4. Risk-Aware Cost Function
Modify `getEnergyCostBreakdown` in `src/algorithms/utils.ts`:
- Calculate `riskFactor` based on the magnitude of roll and pitch.
- Higher angles closer to tipping limits increase cost exponentially or via a weight $k$.
- $TotalCost = EnergyCost \times (1 + k \cdot riskFactor)$.

## Components
- **`src/types/index.ts`**: Update `Scenario`.
- **`src/algorithms/utils.ts`**: New physics/stability math functions.
- **`src/algorithms/astar/astarEnergyAware.ts`**: Integrate stability check in neighbor loop and risk in cost calculation.

## Testing
- Create a test scenario with steep side-slopes (high roll risk).
- Verify algorithm prefers climbing straight up/down (high pitch, low roll) over traversing sideways (high roll).
- Verify robot refuses to enter cells where stability is compromised.
