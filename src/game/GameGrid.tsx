//# Builds the grid cell
import Box from "@mui/material/Box";
import { useMemo, useRef, useState } from "react";
import { useViewport } from "../hooks/useViewport";
import { useGridMouseClicks } from "../hooks/useGridMouseClicks";
import { usePathAnimation } from "../hooks/usePathAnimation";
import { useRobotWalk } from "../hooks/useRobotWalk";
import { MemoizedCell } from "./MemoizedCell";
import { FloatingMenu } from "./FloatingMenu";
import { runAStarManhattan } from "../algorithms/astar/astarManhattan";
import { runAStarEnergyAware } from "../algorithms/astar/astarEnergyAware";
import { type Heading } from "../types";

const GameGrid = () => {
  const viewport = useViewport();

  //* Dynamic cell size for mobile
  const cellSize = viewport.width < 600 ? 20 : 28;

  const [elevationBrushValue, setElevationBrushValue] = useState<number>(5);
  const [pathMetrics, setPathMetrics] = useState<{ distance: number; energy: number } | null>(null);
  const [robotHeading, setRobotHeading] = useState<Heading>("RIGHT");

  //* Grid dimensions
  const cols = Math.floor(viewport.width / cellSize);
  const rows = Math.floor(viewport.height / cellSize);

  //* Set default coordinates
  const defaultRobotCol = Math.floor(cols / 4);
  const defaultDestCol = Math.floor((cols / 4) * 3);
  const defaultRow = Math.floor(rows / 2);

  const currentRunId = useRef<number>(0);

  //Note: we calculate defaults, and pass them into the hook
  const {
    wallNode,
    terrainFactors,
    elevations,
    robotNode,
    destinationNode,
    activeBrush,
    setActiveBrush,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    clearWalls,
  } = useGridMouseClicks(
    `${defaultRow}-${defaultRobotCol}`,
    `${defaultRow}-${defaultDestCol}`,
    elevationBrushValue,
  );

  const {
    isManhattanFinished,
    setIsManhattanFinished,
    isEnergyFinished,
    setIsEnergyFinished,
    showManhattanSearch,
    setShowManhattanSearch,
    showEnergySearch,
    setShowEnergySearch,
    clearAnimations,
    animateResult,
    addTimeout,
  } = usePathAnimation(robotNode, destinationNode);

  const {
    currentPath,
    setCurrentPath,
    walkingStep,
    isWalking,
    hasFinishedWalking,
    handleWalkPath,
    clearWalkState,
  } = useRobotWalk(robotHeading, setRobotHeading, addTimeout);

  const handleClearAnimations = () => {
    clearAnimations(clearWalkState);
  };

  const visualizeAStar = () => {
    handleClearAnimations();

    const scenario = {
      rows,
      cols,
      robotNode,
      destinationNode,
      wallNodes: wallNode,
      terrainFactors: terrainFactors,
      elevations: elevations,
      climbingFactor: 1.5,
      turnPenalty: 2.0,
      initialHeading: robotHeading,
    };

    const { visitedNodesInOrder, shortestPath, totalEnergy, totalDistance } =
      runAStarManhattan(scenario);
    setPathMetrics({ distance: totalDistance, energy: totalEnergy });
    setCurrentPath(shortestPath);
    const duration = animateResult(
      visitedNodesInOrder,
      shortestPath,
      "node-visited",
      "node-open",
      "node-shortest-path",
    );
    const t = setTimeout(() => setIsManhattanFinished(true), duration);
    addTimeout(t as unknown as number);
  };

  const visualizeEnergyAwareAStar = () => {
    handleClearAnimations();

    const scenario = {
      rows,
      cols,
      robotNode,
      destinationNode,
      wallNodes: wallNode,
      terrainFactors: terrainFactors,
      elevations: elevations,
      climbingFactor: 1.5,
      turnPenalty: 2.0,
      initialHeading: robotHeading,
    };

    const { visitedNodesInOrder, shortestPath, totalEnergy, totalDistance } =
      runAStarEnergyAware(scenario);
    setPathMetrics({ distance: totalDistance, energy: totalEnergy });
    setCurrentPath(shortestPath);
    const duration = animateResult(
      visitedNodesInOrder,
      shortestPath,
      "node-energy-visited",
      "node-energy-open",
      "node-energy-shortest-path",
    );
    const t = setTimeout(() => setIsEnergyFinished(true), duration);
    addTimeout(t as unknown as number);
  };

  const handleReset = () => {
    // 1. Increment run ID to instantly kill any currently running async animations
    currentRunId.current += 1;
    handleClearAnimations();
    clearWalls();
    setPathMetrics(null);
  };

  //* For caching grid from user inputs
  const cells = useMemo(() => {
    return Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      return { row, col, key: `${row}-${col}` };
    });
  }, [rows, cols]);

  return (
    //* Builds the container
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
      {/* //* ADD FLOATING MENU */}
      <FloatingMenu
        onClearWalls={clearWalls}
        onVisualizeAStar={visualizeAStar}
        onVisualizeEnergyAwareAStar={visualizeEnergyAwareAStar}
        onReset={handleReset}
        activeBrush={activeBrush}
        onSelectBrush={setActiveBrush}
        elevationValue={elevationBrushValue}
        onElevationChange={setElevationBrushValue}
        pathMetrics={pathMetrics}
        isManhattanFinished={isManhattanFinished}
        isEnergyFinished={isEnergyFinished}
        showManhattanSearch={showManhattanSearch}
        showEnergySearch={showEnergySearch}
        onToggleManhattanSearch={() => setShowManhattanSearch(!showManhattanSearch)}
        onToggleEnergySearch={() => setShowEnergySearch(!showEnergySearch)}
        onWalkPath={handleWalkPath}
        hasPath={!!currentPath}
        isWalking={isWalking}
        currentHeading={robotHeading}
        onHeadingChange={setRobotHeading}
      />

      {/* //* Render each cell into clickable Box cells */}
      <Box
        sx={{
          width: cols * cellSize,
          height: rows * cellSize,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          backgroundColor: "#f2f2f2",
          position: "relative",
        }}
      >
        {/* Walking Robot Overlay */}
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
              isWall={false}
              isRobot={true}
              isDestination={false}
              terrainFactor={0}
              elevation={0}
              heading={robotHeading}
              onMouseDown={() => {}}
              onMouseEnter={() => {}}
            />
          </Box>
        )}

        {cells.map((cell) => {
          return (
            <MemoizedCell
              key={cell.key}
              cellKey={cell.key}
              cellSize={cellSize}
              row={cell.row}
              col={cell.col}
              isWall={wallNode.has(cell.key)}
              isRobot={cell.key === robotNode && !isWalking && !hasFinishedWalking}
              isDestination={cell.key === destinationNode}
              terrainFactor={terrainFactors.get(cell.key) || 0}
              elevation={elevations.get(cell.key) || 0}
              heading={cell.key === robotNode ? robotHeading : undefined}
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
