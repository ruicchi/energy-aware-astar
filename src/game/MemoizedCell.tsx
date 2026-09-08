import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import NorthIcon from "@mui/icons-material/North"
import Box from "@mui/material/Box"
import { memo } from "react"
import type { Heading } from "../shared/types"
import { getElevationGradient } from "../physics/terrainPhysics"
import { TERRAIN_CONFIG, THEME_CONFIG } from "../config/simulationConfig"

type MemoizedCellProps = {
  cellKey: string
  cellSize: number
  row: number
  col: number
  isWall: boolean
  isRobot: boolean
  isDestination: boolean
  terrainFactor: number
  elevation: number
  showGradients?: boolean
  elevations?: Map<string, number>
  heading?: Heading
  onMouseDown: (key: string) => void
  onMouseEnter: (key: string) => void
}

const getRotation = (heading: Heading | undefined) => {
  switch (heading) {
    case "UP":
      return "-90deg"
    case "DOWN":
      return "90deg"
    case "LEFT":
      return "180deg"
    case "RIGHT":
      return "0deg"
    case "UP_LEFT":
      return "-135deg"
    case "UP_RIGHT":
      return "-45deg"
    case "DOWN_LEFT":
      return "135deg"
    case "DOWN_RIGHT":
      return "45deg"
    default:
      return "0deg"
  }
}

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
    const gradient = showGradients && elevations
      ? getElevationGradient(row, col, elevations)
      : null
    const gradientAngle = gradient?.angle ?? 0
    const gradientMagnitude = gradient?.magnitude ?? 0
    const isUnstable = gradient?.isUnstable ?? false

    //* Determine backgroundColor based on cell state. Priority goes to robot/destination
    let bgColor = "transparent"
    if (isRobot)
      bgColor = THEME_CONFIG.robotColor
    else if (isDestination)
      bgColor = THEME_CONFIG.destinationColor
    else if (isWall)
      bgColor = TERRAIN_CONFIG.types.wall.color
    else if (isUnstable && showGradients)
      bgColor = THEME_CONFIG.unstableOverlayColor
    else if (terrainFactor === TERRAIN_CONFIG.types.dirt.cost)
      bgColor = TERRAIN_CONFIG.types.dirt.color
    else if (terrainFactor === TERRAIN_CONFIG.types.water.cost)
      bgColor = TERRAIN_CONFIG.types.water.color
    else if (elevation > 0) {
      bgColor = TERRAIN_CONFIG.getElevationColor(elevation)
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
              color: isUnstable ? THEME_CONFIG.unstableArrowColor : THEME_CONFIG.contourArrowColor,
              opacity: Math.min(1, gradientMagnitude / 2),
            }}
          />
        )}

        {elevation > 0 && !isRobot && !isDestination && !isWall && terrainFactor === 0 && elevation}
      </Box>
    )
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
    )
  },
)
