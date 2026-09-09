import Box from "@mui/material/Box";
import { useMemo } from "react";
import { MemoizedCell } from "./MemoizedCell";
import { resolveCellDisplayState } from "./cellDisplay";
import { FloatingMenu } from "./FloatingMenu";
import { FloatingManual } from "./FloatingManual";
import { useSimulation } from "./SimulationContext";
import { computeGradientField } from "../physics/terrainPhysics";
import { THEME_CONFIG } from "../config/simulationConfig";

const noop = () => {};

const GameGrid = () => {
  const {
    cols,
    rows,
    cellSize,
    wallNode,
    terrainFactors,
    terrainTypes,
    elevations,
    robotNode,
    destinationNode,
    showGradients,
    robotHeading,
    showManhattanSearch,
    showEnergySearch,
    isPathVisible,
    pathTheme,
    currentPath,
    walkingStep,
    isWalking,
    hasFinishedWalking,
    isLocked,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  } = useSimulation();

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

  const isLineVisible = Boolean(
    isPathVisible &&
    currentPath &&
    currentPath.length > 1 &&
    ((pathTheme === "manhattan" && showManhattanSearch) ||
      (pathTheme === "energy" && showEnergySearch)),
  );

  return (
    <Box
      className={`
        ${!showManhattanSearch ? "hide-manhattan-search" : ""}
        ${!showEnergySearch ? "hide-energy-search" : ""}
      `}
      sx={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        userSelect: "none",
        position: "relative",
        touchAction: "none",
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <FloatingMenu />
      <FloatingManual />

      <Box
        sx={{
          width: cols * cellSize,
          height: rows * cellSize,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          backgroundColor: "#f2f2f2",
          position: "relative",
          pointerEvents: isLocked ? "none" : "auto",
        }}
      >
        {isLineVisible && currentPath && (
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: cols * cellSize,
              height: rows * cellSize,
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            <polyline
              points={currentPath
                .map((key) => {
                  const [r, c] = key.split("-").map(Number);
                  const x = c * cellSize + cellSize / 2;
                  const y = r * cellSize + cellSize / 2;
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke={THEME_CONFIG.pathLineColor}
              strokeWidth={Math.max(2, Math.round(cellSize * 0.1))}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {(isWalking || hasFinishedWalking) && currentPath && walkingStep !== -1 && (
          <Box
            sx={{
              position: "absolute",
              width: cellSize,
              height: cellSize,
              zIndex: 10,
              pointerEvents: "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#4caf50",
              left: Number(currentPath[walkingStep].split("-")[1]) * cellSize,
              top: Number(currentPath[walkingStep].split("-")[0]) * cellSize,
              transition: isWalking ? "all 0.2s linear" : "none",
            }}
          >
            <MemoizedCell
              cellKey="walking-robot"
              cellSize={cellSize}
              row={0}
              col={0}
              displayState={{
                bgColor: THEME_CONFIG.robotColor,
                isWall: false,
                isRobot: true,
                isDestination: false,
                robotHeading,
              }}
              onMouseDown={noop}
              onMouseEnter={noop}
            />
          </Box>
        )}

        {cells.map((cell) => {
          const isRobot = cell.key === robotNode;
          const displayState = resolveCellDisplayState({
            isWall: wallNode.has(cell.key),
            isRobot,
            isDestination: cell.key === destinationNode,
            terrainFactor: terrainFactors.get(cell.key) || 0,
            terrainType: terrainTypes.get(cell.key),
            elevation: elevations.get(cell.key) || 0,
            robotHeading:
              isRobot && !isWalking && !hasFinishedWalking ? robotHeading : undefined,
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
    </Box>
  );
};

export default GameGrid;
