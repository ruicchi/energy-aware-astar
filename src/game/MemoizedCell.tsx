import { memo } from "react";
import { THEME_CONFIG } from "../config/simulationConfig";
import { areCellDisplayPropsEqual, type CellDisplayState } from "./cellDisplay";

export type { CellDisplayState, GradientArrowDisplay } from "./cellDisplay";

export interface MemoizedCellProps {
  cellKey: string;
  cellSize: number;
  row: number;
  col: number;
  displayState: CellDisplayState;
  onMouseDown: (key: string) => void;
  onMouseEnter: (key: string) => void;
}

//* React.memo prevents this cell from re-rendering unless its presentation properties change
export const MemoizedCell = memo(
  function MemoizedCell({
    cellKey,
    cellSize,
    row,
    col,
    displayState,
    onMouseDown,
    onMouseEnter,
  }: MemoizedCellProps) {
    const {
      bgColor,
      isWall,
      elevationLabel,
      gradientArrow,
    } = displayState;

    return (
      <div
        id={`cell-${cellKey}`}
        data-cell-key={cellKey}
        onMouseDown={() => onMouseDown(cellKey)}
        onMouseEnter={() => onMouseEnter(cellKey)}
        className={`grid-cell ${isWall ? "is-wall" : ""}`}
        style={{
          width: cellSize,
          height: cellSize,
          backgroundColor: bgColor || undefined,
          borderTop: row === 0 ? `1px solid ${THEME_CONFIG.cellBorderColor}` : undefined,
          borderLeft: col === 0 ? `1px solid ${THEME_CONFIG.cellBorderColor}` : undefined,
        }}
      >
        {gradientArrow && (
          <svg
            viewBox="0 0 24 24"
            style={{
              width: cellSize * 0.6,
              height: cellSize * 0.6,
              transform: `rotate(${gradientArrow.rotationDeg}deg)`,
              color: gradientArrow.isUnstable
                ? THEME_CONFIG.unstableArrowColor
                : THEME_CONFIG.contourArrowColor,
              opacity: gradientArrow.opacity,
              pointerEvents: "none",
              fill: "currentColor",
            }}
          >
            <path d="m12 5 6 6-1.41 1.41L13 8.83V19h-2V8.83l-3.59 3.58L6 11l6-6z" />
          </svg>
        )}

        {elevationLabel != null && elevationLabel}
      </div>
    );
  },
  areCellDisplayPropsEqual,
);
