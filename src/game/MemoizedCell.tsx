import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import NorthIcon from "@mui/icons-material/North";
import Box from "@mui/material/Box";
import { memo } from "react";
import { THEME_CONFIG, getHeadingRotation } from "../config/simulationConfig";
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
      isRobot,
      isDestination,
      robotHeading,
      elevationLabel,
      gradientArrow,
    } = displayState;

    return (
      <Box
        id={`cell-${cellKey}`}
        onMouseDown={() => onMouseDown(cellKey)}
        onMouseEnter={() => onMouseEnter(cellKey)}
        className={`${isRobot ? "is-robot" : ""} ${isDestination ? "is-destination" : ""} ${isWall ? "is-wall" : ""}`}
        sx={{
          width: cellSize,
          height: cellSize,
          boxSizing: "border-box",
          borderRight: `1px solid ${THEME_CONFIG.cellBorderColor}`,
          borderBottom: `1px solid ${THEME_CONFIG.cellBorderColor}`,
          borderTop: row === 0 ? `1px solid ${THEME_CONFIG.cellBorderColor}` : "none",
          borderLeft: col === 0 ? `1px solid ${THEME_CONFIG.cellBorderColor}` : "none",
          backgroundColor: bgColor,
          cursor: "pointer",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "8px",
          color: "white",
          position: "relative",
        }}
      >
        {isRobot && robotHeading && robotHeading !== "NONE" && (
          <ArrowForwardIcon
            sx={{
              fontSize: cellSize * 0.8,
              transform: `rotate(${getHeadingRotation(robotHeading)})`,
              transition: "transform 0.2s ease-in-out",
              pointerEvents: "none",
            }}
          />
        )}

        {gradientArrow && (
          <NorthIcon
            sx={{
              fontSize: cellSize * 0.6,
              transform: `rotate(${gradientArrow.rotationDeg}deg)`,
              color: gradientArrow.isUnstable
                ? THEME_CONFIG.unstableArrowColor
                : THEME_CONFIG.contourArrowColor,
              opacity: gradientArrow.opacity,
              pointerEvents: "none",
            }}
          />
        )}

        {elevationLabel != null && elevationLabel}
      </Box>
    );
  },
  areCellDisplayPropsEqual,
);
