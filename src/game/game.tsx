//# Builds the grid cell
import Box from '@mui/material/Box';
import { useMemo } from 'react';
import {
  useViewport,
  useGridMouseClicks,
  MemoizedCell,
  FloatingMenu,
} from '../index';

const GameGrid = ({ cellSize = 28 }) => {
  const viewport = useViewport();

  //* Grid dimensions
  const cols = Math.floor(viewport.width / cellSize);
  const rows = Math.floor(viewport.height / cellSize);

  //* Set default coordinates
  const defaultRobotCol = Math.floor(cols / 4);
  const defaultDestCol = Math.floor((cols / 4) * 3);
  const defaultRow = Math.floor(rows / 2);

  //Note: we calculate defaults, and pass them into the hook
  const {
    wallNode,
    robotNode,
    destinationNode,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    clearWalls,
  } = useGridMouseClicks(
    `${defaultRow}-${defaultRobotCol}`,
    `${defaultRow}-${defaultDestCol}`,
  );

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
      sx={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        userSelect: 'none',
        position: 'relative',
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* //* ADD FLOATING MENU */}
      <FloatingMenu onClearWalls={clearWalls} />

      {/* //* Render each cell into clickable Box cells */}
      <Box
        sx={{
          width: cols * cellSize,
          height: rows * cellSize,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          backgroundColor: '#f2f2f2',
        }}
      >
        {cells.map((cell) => {
          return (
            <MemoizedCell
              key={cell.key}
              cellKey={cell.key}
              cellSize={cellSize}
              row={cell.row}
              col={cell.col}
              isWall={wallNode.has(cell.key)}
              isRobot={cell.key === robotNode}
              isDestination={cell.key === destinationNode}
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
