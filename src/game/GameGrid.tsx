import Box from "@mui/material/Box"
import { useMemo } from "react"
import { MemoizedCell } from "./MemoizedCell"
import { FloatingMenu } from "./FloatingMenu"
import { FloatingInstructions } from "./FloatingInstructions"
import { useSimulation } from "./SimulationContext"

const GameGrid = () => {
  const {
    cols,
    rows,
    cellSize,
    wallNode,
    terrainFactors,
    elevations,
    robotNode,
    destinationNode,
    showGradients,
    robotHeading,
    showManhattanSearch,
    showEnergySearch,
    currentPath,
    walkingStep,
    isWalking,
    hasFinishedWalking,
    isLocked,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  } = useSimulation()

  const cells = useMemo(() => {
    return Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      return { row, col, key: `${row}-${col}` }
    })
  }, [rows, cols])

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
      <FloatingInstructions />

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
              showGradients={showGradients}
              elevations={elevations}
              heading={robotHeading}
              onMouseDown={() => {}}
              onMouseEnter={() => {}}
            />
          </Box>
        )}

        {cells.map((cell) => (
          <MemoizedCell
            key={cell.key}
            cellKey={cell.key}
            cellSize={cellSize}
            row={cell.row}
            col={cell.col}
            isWall={wallNode.has(cell.key)}
            isRobot={cell.key === robotNode}
            isDestination={cell.key === destinationNode}
            terrainFactor={terrainFactors.get(cell.key) || 0}
            elevation={elevations.get(cell.key) || 0}
            showGradients={showGradients}
            elevations={elevations}
            heading={
              cell.key === robotNode && !isWalking && !hasFinishedWalking
                ? robotHeading
                : undefined
            }
            onMouseDown={handleMouseDown}
            onMouseEnter={handleMouseEnter}
          />
        ))}
      </Box>
    </Box>
  )
}

export default GameGrid
