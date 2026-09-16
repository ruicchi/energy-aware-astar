import { memo, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { MemoizedCell } from "./MemoizedCell";
import { resolveCellDisplayState } from "./cellDisplay";
import { computeGradientField } from "../physics/terrainPhysics";
import {
  useSimulationEngine,
  useSimulationSelector,
  shallowEqual,
  selectGridCanvas,
} from "./simulationHooks";
import { THEME_CONFIG, UI_CONFIG, getHeadingRotation } from "../config/simulationConfig";

/**
 * The deep SimulationCanvas module.
 * Consolidates grid terrain rendering, cell elevation & gradient display,
 * kinematic actor positioning (robot and destination), search polyline geometry,
 * and transactional pointer stroke event handling behind a unified canvas seam.
 */
export const SimulationCanvas = memo(function SimulationCanvas() {
  const engine = useSimulationEngine();
  const state = useSimulationSelector(selectGridCanvas, shallowEqual);

  const {
    cols,
    rows,
    cellSize,
    isFixedDimensions,
    wallNodes,
    terrainFactors,
    terrainTypes,
    elevations,
    showGradients,
    maxTraversableSlope,
    robotNode,
    destinationNode,
    robotHeading,
    activeStrokeBrush,
    isWalking,
    isLocked,
    showManhattanSearch,
    showEnergySearch,
    isLineVisible,
    polylinePoints,
    currentPath,
  } = state;

  const handleMouseDown = useCallback((key: string) => engine.startPaint(key), [engine]);
  const handleMouseEnter = useCallback((key: string) => engine.continuePaint(key), [engine]);
  const handleMouseUp = useCallback(() => engine.endPaint(), [engine]);

  const cells = useMemo(() => {
    return Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      return { row, col, key: `${row}-${col}` };
    });
  }, [rows, cols]);

  const gradientField = useMemo(() => {
    if (!showGradients) return null;
    return computeGradientField(rows, cols, elevations, maxTraversableSlope);
  }, [rows, cols, elevations, showGradients, maxTraversableSlope]);

  const [robotRow, robotCol] = useMemo(() => {
    const parts = robotNode.split("-");
    return [Number(parts[0]), Number(parts[1])];
  }, [robotNode]);

  const [destRow, destCol] = useMemo(() => {
    const parts = destinationNode.split("-");
    return [Number(parts[0]), Number(parts[1])];
  }, [destinationNode]);

  return (
    <Box
      className={`
        simulation-canvas-viewport
        ${!showManhattanSearch ? "hide-manhattan-search" : ""}
        ${!showEnergySearch ? "hide-energy-search" : ""}
      `}
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Box
        sx={{
          width: cols * cellSize,
          height: rows * cellSize,
          position: "relative",
          backgroundColor: THEME_CONFIG.gridBackgroundColor,
          pointerEvents: isLocked ? "none" : "auto",
          boxShadow: isFixedDimensions ? "0 8px 32px rgba(0, 0, 0, 0.45)" : "none",
          border: isFixedDimensions ? "2px solid rgba(255, 255, 255, 0.15)" : "none",
          borderRadius: isFixedDimensions ? 1 : 0,
        }}
      >
        {/* Terrain Cells Grid */}
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          }}
        >
          {cells.map((cell) => {
            const displayState = resolveCellDisplayState({
              isWall: wallNodes.has(cell.key),
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
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
              />
            );
          })}
        </Box>

        {/* Search Path Polyline Overlay */}
        {isLineVisible && currentPath && (
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: cols * cellSize,
              height: rows * cellSize,
              pointerEvents: "none",
              zIndex: UI_CONFIG.zIndex.polyline,
            }}
          >
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={THEME_CONFIG.pathLineColor}
              strokeWidth={Math.max(2, Math.round(cellSize * 0.1))}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Robot Kinematic Actor */}
        <Box
          id="robot-actor"
          data-testid="robot-actor"
          onMouseDown={(e) => {
            if (isWalking) return;
            e.stopPropagation();
            handleMouseDown(robotNode);
          }}
          style={
            isWalking
              ? undefined
              : {
                  transform: `translate3d(${robotCol * cellSize}px, ${robotRow * cellSize}px, 0)`,
                  transition: "none",
                }
          }
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: cellSize,
            height: cellSize,
            backgroundColor: THEME_CONFIG.robotColor,
            zIndex: UI_CONFIG.zIndex.actors,
            pointerEvents: activeStrokeBrush === "robot" || isWalking ? "none" : "auto",
            cursor: activeStrokeBrush === "robot" ? "grabbing" : "grab",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxSizing: "border-box",
            border: `1px solid ${THEME_CONFIG.actorBorderColor}`,
            userSelect: "none",
            touchAction: "none",
          }}
        >
          <ArrowForwardIcon
            id="robot-actor-arrow"
            style={{
              transform: `rotate(${getHeadingRotation(robotHeading)})`,
              display: robotHeading && robotHeading !== "NONE" ? "block" : "none",
            }}
            sx={{
              fontSize: cellSize * 0.8,
              color: "#ffffff",
              pointerEvents: "none",
            }}
          />
        </Box>

        {/* Destination Target Actor */}
        <Box
          id="destination-actor"
          data-testid="destination-actor"
          onMouseDown={(e) => {
            if (isWalking) return;
            e.stopPropagation();
            handleMouseDown(destinationNode);
          }}
          style={{
            transform: `translate3d(${destCol * cellSize}px, ${destRow * cellSize}px, 0)`,
          }}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: cellSize,
            height: cellSize,
            backgroundColor: THEME_CONFIG.destinationColor,
            zIndex: UI_CONFIG.zIndex.actors,
            pointerEvents: activeStrokeBrush === "destination" || isWalking ? "none" : "auto",
            cursor: activeStrokeBrush === "destination" ? "grabbing" : "grab",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxSizing: "border-box",
            border: `1px solid ${THEME_CONFIG.actorBorderColor}`,
            userSelect: "none",
            touchAction: "none",
          }}
        />
      </Box>
    </Box>
  );
});
