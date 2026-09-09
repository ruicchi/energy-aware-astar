import { memo, useMemo } from "react";
import { MemoizedCell } from "./MemoizedCell";
import { resolveCellDisplayState } from "./cellDisplay";
import { computeGradientField } from "../physics/terrainPhysics";

export interface TerrainGridProps {
  rows: number;
  cols: number;
  cellSize: number;
  wallNode: Set<string>;
  terrainFactors: Map<string, number>;
  terrainTypes: Map<string, "dirt" | "water">;
  elevations: Map<string, number>;
  showGradients: boolean;
  onMouseDown: (key: string) => void;
  onMouseEnter: (key: string) => void;
}

export const TerrainGrid = memo(
  function TerrainGrid({
    rows,
    cols,
    cellSize,
    wallNode,
    terrainFactors,
    terrainTypes,
    elevations,
    showGradients,
    onMouseDown,
    onMouseEnter,
  }: TerrainGridProps) {
    const cells = useMemo(() => {
      return Array.from({ length: rows * cols }, (_, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        return { row, col, key: `${row}-${col}` };
      });
    }, [rows, cols]);

    const gradientField = useMemo(() => {
      if (!showGradients) return null;
      return computeGradientField(rows, cols, elevations);
    }, [rows, cols, elevations, showGradients]);

    return (
      <>
        {cells.map((cell) => {
          const displayState = resolveCellDisplayState({
            isWall: wallNode.has(cell.key),
            isRobot: false,
            isDestination: false,
            terrainFactor: terrainFactors.get(cell.key) || 0,
            terrainType: terrainTypes.get(cell.key),
            elevation: elevations.get(cell.key) || 0,
            gradient: gradientField?.get(cell.key) ?? null,
            showGradients,
          });

          return (
            <MemoizedCell
              key={cell.key}
              cellKey={cell.key}
              cellSize={cellSize}
              row={cell.row}
              col={cell.col}
              displayState={displayState}
              onMouseDown={onMouseDown}
              onMouseEnter={onMouseEnter}
            />
          );
        })}
      </>
    );
  },
);
