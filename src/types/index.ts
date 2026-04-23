export type BrushMode = 'wall' | 'dirt' | 'water' | 'elevation' | 'robot' | 'destination' | null;

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
  elevationCost: number;
  turnCost: number;
  total: number;
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
}
