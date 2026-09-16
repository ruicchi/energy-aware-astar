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

**Simulation Playback**:
The deep module executing discrete animation timelines, managing time progression, cancellation tokens, manual stepping, and playback lifecycle states across path searches and vehicle locomotion.
_Avoid_: AnimationManager, TimerService, PlaybackController, Scheduler

**Simulation Visualizer**:
The deep module providing a coarse-grained seam between simulation logic and visual rendering targets, encapsulating search progress styling, actor kinematic posing, and transient stroke preview effects across browser DOM and headless environments.
_Avoid_: DomAdapter, RenderService, UIController, ViewportHelper

**Terrain Physics**:
The deep module computing spatial elevation gradients, vehicle posture (roll, pitch), and Santos center-of-mass stability constraints across terrain.
_Avoid_: TerrainUtils, PhysicsEngine, MathUtils

**Scenario Terrain**:
The deep module encapsulating persistent grid topology, obstacle boundaries, terrain friction factors, elevation distributions, actor placements, and transactional pointer stroke mutations across all grid layers.
_Avoid_: GridState, TerrainModel, WallManager, GridPaintBuffer

**Simulation Configuration**:
The consolidated configuration module defining physical vehicle dimensions, terrain parameters, energy weights, animation timings, and visualization theme colors.
_Avoid_: Constants, GlobalSettings, AppConfig

**Benchmark Engine**:
The deep module executing algorithm comparison experiments across deterministic and Monte Carlo procedural suites (`runDeterministicBenchmarkSuite`, `runMonteCarloBenchmarkSuite`, `runBenchmarkExperiment`), coordinating trial execution, statistical hypothesis testing, and publication artifact generation through a unified interface.
_Avoid_: BenchmarkRunner, TestHarness, PerfTest

**Statistical Analysis**:
The mathematical module evaluating benchmark distributions, computing sample variances, normal cumulative distributions, paired two-tailed $t$-tests, and relative energy conservation metrics.
_Avoid_: MathHelpers, StatsUtils, AnalysisService

**Benchmark Reporters**:
The presentation adapters serializing benchmark telemetry and statistical summaries into structured CSV records, LaTeX `booktabs` tables, and Chapter 4 discussion Markdown summaries.
_Avoid_: TableFormatters, Exporters, LatexGenerators

**Simulation Canvas**:
The deep module (`SimulationCanvas`) consolidating grid terrain visualization, cell elevation and gradient display, search polyline geometry, kinematic actor posing, and pointer stroke event handlers behind a self-contained canvas seam.
_Avoid_: ViewportHooks, CanvasStore, GridSelectors, TerrainGrid, ActorComponents

**Simulation Control Seam**:
The cohesive domain hooks (`useSimulationControls`, `useBrushControls`, `useHeadingControls`, `usePathMetrics`) aggregating scenario configuration, brush parameters, algorithm selection, and playback commands across control panels.
_Avoid_: ControlHooks, ToolRibbonManager, PanelState

**Simulation HUD Seam**:
The unified layout module (`SimulationHud`) and pure placement resolver (`resolveHudLayout`) orchestrating floating control panels, terrain brushes, interactive instructions, and calculation modals with responsive, non-colliding coordinates across viewports.
_Avoid_: FloatingMenu, OverlayManager, DialogService, WindowManager

