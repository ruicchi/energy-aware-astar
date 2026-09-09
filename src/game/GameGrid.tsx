import { useMemo } from "react";
import Box from "@mui/material/Box";
import { FloatingMenu } from "./FloatingMenu";
import { FloatingBrushes } from "./FloatingBrushes";
import { FloatingManual } from "./FloatingManual";
import { useSimulation } from "./SimulationContext";
import { TerrainGrid } from "./TerrainGrid";
import { RobotActor } from "./actors/RobotActor";
import { DestinationActor } from "./actors/DestinationActor";
import { THEME_CONFIG, UI_CONFIG } from "../config/simulationConfig";

export default function GameGrid() {
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
    activeStrokeBrush,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  } = useSimulation();

  const isLineVisible = Boolean(
    isPathVisible &&
    currentPath &&
    currentPath.length > 1 &&
    ((pathTheme === "manhattan" && showManhattanSearch) ||
      (pathTheme === "energy" && showEnergySearch)),
  );

  const polylinePoints = useMemo(() => {
    if (!isLineVisible || !currentPath) return "";
    return currentPath
      .map((key) => {
        const [r, c] = key.split("-").map(Number);
        const x = c * cellSize + cellSize / 2;
        const y = r * cellSize + cellSize / 2;
        return `${x},${y}`;
      })
      .join(" ");
  }, [isLineVisible, currentPath, cellSize]);

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
      <FloatingBrushes />
      <FloatingManual />

      <Box
        sx={{
          width: cols * cellSize,
          height: rows * cellSize,
          position: "relative",
          backgroundColor: THEME_CONFIG.gridBackgroundColor,
          pointerEvents: isLocked ? "none" : "auto",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          }}
        >
          <TerrainGrid
            rows={rows}
            cols={cols}
            cellSize={cellSize}
            wallNode={wallNode}
            terrainFactors={terrainFactors}
            terrainTypes={terrainTypes}
            elevations={elevations}
            showGradients={showGradients}
            onMouseDown={handleMouseDown}
            onMouseEnter={handleMouseEnter}
          />
        </Box>

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

        <RobotActor
          robotNode={robotNode}
          cellSize={cellSize}
          robotHeading={robotHeading}
          isDragging={activeStrokeBrush === "robot"}
          isWalking={isWalking}
          hasFinishedWalking={hasFinishedWalking}
          walkingStep={walkingStep}
          currentPath={currentPath}
          onMouseDown={handleMouseDown}
        />

        <DestinationActor
          destinationNode={destinationNode}
          cellSize={cellSize}
          isDragging={activeStrokeBrush === "destination"}
          isWalking={isWalking}
          onMouseDown={handleMouseDown}
        />
      </Box>
    </Box>
  );
}
