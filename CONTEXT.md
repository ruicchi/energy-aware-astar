# Energy-Aware Path Planning

Simulation and planning environment for autonomous ground vehicle navigation optimizing energy expenditure and vehicle stability over elevated, irregular terrain.

## Language

**Scenario**:
The complete environment configuration defining grid dimensions, obstacles, terrain difficulty factors, elevation maps, and physical robot limits.
_Avoid_: GridConfig, Environment, MapState

**Pathfinding Engine**:
The deep module that computes the optimal path from the robot start node to the destination node according to a search policy.
_Avoid_: PathfindingService, AlgorithmRegistry, Solver

**Search Policy**:
The internal specification governing state-space keying (2D coordinates vs. 3D pose), neighbor connectivity, traversal admissibility, cost accumulation, and heuristics.
_Avoid_: AlgorithmStrategy, HeuristicStrategy

**Energy-Aware Policy**:
A search policy that models 3D robot states (row, column, heading) to optimize total battery expenditure considering terrain friction, elevation gradients, turning angles, and Santos center-of-mass stability limits.
_Avoid_: EnergyStrategy, BatteryPlanner

**Standard Policy**:
A search policy that models 2D grid coordinates (row, column) to minimize spatial distance using classical distance metrics (Manhattan, Euclidean, Chebyshev, Octile).
_Avoid_: ClassicAStar, DistanceStrategy

**Heading**:
The discrete orientation of the robot on the grid across 8 directions or NONE.
_Avoid_: Direction, Orientation, Angle

**Pathfinding Result**:
The telemetry and route produced by the pathfinding engine, containing visited node sequences for animation, shortest path coordinates, total distance, and itemized energy expenditure breakdowns.
_Avoid_: SearchOutput, PlanResult

**Simulation Engine**:
The deep module coordinating grid terrain state, vehicle parameters, path planning triggers, and locomotion playback across the interface.
_Avoid_: SimulationContext, Store, GameManager
