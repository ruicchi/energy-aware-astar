//# Builds the grid cell

import Box from '@mui/material/Box';
import { useMemo } from 'react';
import { useViewport, useGridMouseClicks, MemoizedCell } from './index';

const FullBorderedGrid = ({ cellSize = 28 }) => {
  //* Use viewport hook
  const viewport = useViewport();

  //* Use the extracted mouse logic hook
  const { activeCells, handleMouseDown, handleMouseEnter, handleMouseUp } = useGridMouseClicks();

  //* Grid dimensions
  const cols = Math.floor(viewport.width / cellSize);
  const rows = Math.floor(viewport.height / cellSize);

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
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
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
              isActive={activeCells.has(cell.key)}
              onMouseDown={handleMouseDown}
              onMouseEnter={handleMouseEnter}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default FullBorderedGrid;
