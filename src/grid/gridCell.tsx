//# Builds the grid cell

import { Box, useEffect, useMemo, useState } from './index';

const FullBorderedGrid = ({ cellSize = 28 }) => {
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  //* Initialize default values for cells
  const [activeCells, setActiveCells] = useState<Set<string>>(new Set());
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawValue, setDrawValue] = useState(false);

  //* Listener for resizing current window size
  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  //* Grid dimensions
  const cols = Math.floor(viewport.width / cellSize);
  const rows = Math.floor(viewport.height / cellSize);
  
  //* For caching user inputs
  const cells = useMemo(() => {
    return Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      return { row, col, key: `${row}-${col}` };
    });
  }, [rows, cols]);

  //* Helper for painting cells
  const paintCell = (key: string, value: boolean) => {
    setActiveCells((prev) => {
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  //* Mouse interaction handlers
  const handleMouseDown = (key: string) => {
    const nextValue = !activeCells.has(key);
    setDrawValue(nextValue);
    setIsDrawing(true);
    paintCell(key, nextValue);
  };

  const handleMouseEnter = (key: string) => {
    if (!isDrawing) return;
    paintCell(key, drawValue);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

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

      //* Render each cell into clickable Box cells
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
          const isActive = activeCells.has(cell.key);

          return (
            <Box
              key={cell.key}
              onMouseDown={() => handleMouseDown(cell.key)}
              onMouseEnter={() => handleMouseEnter(cell.key)}
              sx={{
                width: cellSize,
                height: cellSize,
                boxSizing: 'border-box',
                borderRight: '1px solid #b8b8b8',
                borderBottom: '1px solid #b8b8b8',
                borderTop: cell.row === 0 ? '1px solid #b8b8b8' : 'none',
                borderLeft: cell.col === 0 ? '1px solid #b8b8b8' : 'none',
                backgroundColor: isActive ? '#1a88e2' : 'transparent',
                cursor: 'pointer',
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}

export default FullBorderedGrid;