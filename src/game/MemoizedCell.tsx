import { memo } from "react";
import Box from "@mui/material/Box";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import NorthIcon from "@mui/icons-material/North";
import { type Heading } from "../types";

//study
type MemoizedCellProps = {
  cellKey: string;
  cellSize: number;
  row: number;
  col: number;
  isWall: boolean;
  isRobot: boolean;
  isDestination: boolean;
  terrainFactor: number;
  elevation: number;
  showGradients?: boolean;
  elevations?: Map<string, number>;
  heading?: Heading;
  onMouseDown: (key: string) => void;
  onMouseEnter: (key: string) => void;
};

const getRotation = (heading: Heading | undefined) => {
  switch (heading) {
    case "UP":
      return "-90deg";
    case "DOWN":
      return "90deg";
    case "LEFT":
      return "180deg";
    case "RIGHT":
      return "0deg";
    case "UP_LEFT":
      return "-135deg";
    case "UP_RIGHT":
      return "-45deg";
    case "DOWN_LEFT":
      return "135deg";
    case "DOWN_RIGHT":
      return "45deg";
    default:
      return "0deg";
  }
};

//* React.memo prevents this cell from re-rendering unless its props change
export const MemoizedCell = memo(
  ({
    cellKey,
    cellSize,
    row,
    col,
    isWall,
    isRobot,
    isDestination,
    terrainFactor,
    heading,
    elevation,
    showGradients,
    elevations,
    onMouseDown,
    onMouseEnter,
  }: MemoizedCellProps) => {
    //* Gradient Calculation
    let gradientAngle = 0;
    let gradientMagnitude = 0;
    let isUnstable = false;

    if (showGradients && elevations) {
      const getElevation = (r: number, c: number) => elevations.get(`${r}-${c}`) || 0;
      
      const zTL = getElevation(row - 1, col - 1);
      const zT = getElevation(row - 1, col);
      const zTR = getElevation(row - 1, col + 1);
      const zL = getElevation(row, col - 1);
      const zR = getElevation(row, col + 1);
      const zBL = getElevation(row + 1, col - 1);
      const zB = getElevation(row + 1, col);
      const zBR = getElevation(row + 1, col + 1);

      // Distance-weighted gradient: Cardinal = 1, Diagonal = 1/sqrt(2)
      const invSqrt2 = 1 / Math.sqrt(2);
      const weight = 1 + 2 * invSqrt2;
      
      const zx = ((zR + invSqrt2 * (zTR + zBR)) - (zL + invSqrt2 * (zTL + zBL))) / weight;
      const zy = ((zB + invSqrt2 * (zBL + zBR)) - (zT + invSqrt2 * (zTL + zTR))) / weight;

      gradientMagnitude = Math.sqrt(zx * zx + zy * zy);
      if (gradientMagnitude > 0.05) {
        gradientAngle = Math.atan2(zy, zx);
      }

      // Consistent instability threshold (approx 63 deg or slope > 2)
      if (gradientMagnitude > 2.0) {
        isUnstable = true;
      }
    }

    //* Determine backgroundColor based on cell state. Priority goes to robot/destination
    let bgColor = "transparent";
    if (isRobot)
      bgColor = "#4caf50"; //* Green for Robot
    else if (isDestination)
      bgColor = "#f44336"; //* Red for Destination
    else if (isWall)
      bgColor = "#1a88e2"; //* Blue for walls/active cells
    else if (isUnstable && showGradients)
      bgColor = "rgba(255, 0, 0, 0.3)"; //* Light red for unstable cells
    else if (terrainFactor === 0.5)
      bgColor = "#d2b48c"; //* Dirt (Tan)
    else if (terrainFactor === 0.1)
      bgColor = "#00ffff"; //* Water (Cyan)
    else if (elevation > 0) {
      //* Visual feedback for elevation (darker green for higher)
      const brightness = Math.max(0, 255 - elevation * 20);
      bgColor = `rgb(0, ${brightness}, 0)`;
    }

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
          borderRight: "1px solid #b8b8b8",
          borderBottom: "1px solid #b8b8b8",
          borderTop: row === 0 ? "1px solid #b8b8b8" : "none",
          borderLeft: col === 0 ? "1px solid #b8b8b8" : "none",
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
        {isRobot && heading && heading !== "NONE" && (
          <ArrowForwardIcon
            sx={{
              fontSize: cellSize * 0.8,
              transform: `rotate(${getRotation(heading)})`,
              transition: "transform 0.2s ease-in-out",
            }}
          />
        )}
        
        {showGradients && gradientMagnitude > 0.1 && !isRobot && !isDestination && !isWall && (
          <NorthIcon
            sx={{
              fontSize: cellSize * 0.6,
              // Math.atan2 is relative to positive x-axis (Right)
              // NorthIcon starts pointing Up (-90deg relative to Right)
              // So we add 90deg to rotate it correctly
              transform: `rotate(${gradientAngle * (180 / Math.PI) + 90}deg)`,
              color: isUnstable ? "#ff5252" : "rgba(255, 255, 255, 0.6)",
              opacity: Math.min(1, gradientMagnitude / 2),
            }}
          />
        )}

        {elevation > 0 && !isRobot && !isDestination && !isWall && terrainFactor === 0 && !showGradients && elevation}
      </Box>
    );
  },
  (prevProps, nextProps) => {
    //* This only re-renders if the cell state tracking changes
    return (
      prevProps.isWall === nextProps.isWall &&
      prevProps.isRobot === nextProps.isRobot &&
      prevProps.isDestination === nextProps.isDestination &&
      prevProps.terrainFactor === nextProps.terrainFactor &&
      prevProps.elevation === nextProps.elevation &&
      prevProps.cellSize === nextProps.cellSize &&
      prevProps.heading === nextProps.heading &&
      prevProps.showGradients === nextProps.showGradients &&
      prevProps.elevations === nextProps.elevations
    );
  },
);
