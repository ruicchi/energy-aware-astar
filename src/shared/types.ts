export type BrushMode = "wall" | "dirt" | "water" | "elevation" | "robot" | "destination" | null;

export type Heading =
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT"
  | "UP_LEFT"
  | "UP_RIGHT"
  | "DOWN_LEFT"
  | "DOWN_RIGHT"
  | "NONE";

export type EnergyNode = {
  key: string; // "row-col-heading"
  row: number;
  col: number;
  heading: Heading;
  g: number; // Cumulative energy cost
  h: number; // Heuristic energy to destination
  f: number; // g + h
  parent: EnergyNode | null;
};

export type EnergyBreakdown = {
  baseMovement: number;
  straightMovement: number;
  diagonalMovement: number;
  dirtPenalty: number;
  waterPenalty: number;
  otherTerrainPenalty: number;
  climbingCost: number;
  turnCost: number;
  stabilityPenalty: number;
  total: number;
  nodesEvaluated: number;
};

export interface Scenario {
  rows: number;
  cols: number;
  robotNode: string; // "row-col"
  destinationNode: string; // "row-col"
  wallNodes: Set<string>;
  terrainFactors: Map<string, number>;
  elevations: Map<string, number>;
  climbingFactor: number;
  turnPenalty: number;
  maxTraversableSlope?: number;
  initialHeading: Heading;
  showGradients?: boolean;
  robotPhysics?: {
    trackWidth: number
    wheelBase: number
    comHeight: number
    stabilityMargin: number
  }
}

export type VisitedNode = { key: string; type: "open" | "closed" }

export interface PathfindingResult {
  visitedNodesInOrder: VisitedNode[]
  shortestPath: string[]
  totalDistance: number
  totalEnergy: number
  energyBreakdown: EnergyBreakdown
}

export type AlgorithmType = "energyAware" | "manhattan" | "euclidean" | "octile" | "chebyshev"

