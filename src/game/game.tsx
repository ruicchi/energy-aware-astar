//# Builds the grid cell
import Box from '@mui/material/Box';
import { useMemo, useRef } from 'react';
import {
  useViewport,
  useGridMouseClicks,
  MemoizedCell,
  FloatingMenu,
  runAStar
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

  // Keep track of timeouts so we can cancel them if needed
  const animationTimeouts = useRef<number[]>([]);

  const visualizeAStar = () => {
    // 1. Clear any previous animations
    animationTimeouts.current.forEach(clearTimeout);
    animationTimeouts.current = [];
    
    // Clear previous visual classes from the DOM
    document.querySelectorAll('.node-visited, .node-shortest-path').forEach(el => {
      el.classList.remove('node-visited', 'node-shortest-path');
    });

    // 2. Run calculation
    const { visitedNodesInOrder, shortestPath } = runAStar(
      rows, cols, robotNode, destinationNode, wallNode
    );

    // 3. Animate Visited Nodes
    for (let i = 0; i < visitedNodesInOrder.length; i++) {
      const timeout = setTimeout(() => {
        const node = document.getElementById(`cell-${visitedNodesInOrder[i]}`);
        if (node) node.classList.add('node-visited');
      }, 10 * i); // 10ms per node
      animationTimeouts.current.push(timeout);
    }

    // 4. Animate Shortest Path after visited nodes finish
    const pathDelay = visitedNodesInOrder.length * 10;
    for (let i = 0; i < shortestPath.length; i++) {
      // Don't overwrite the start and destination node colors
      if (shortestPath[i] === robotNode || shortestPath[i] === destinationNode) continue;
      
      const timeout = setTimeout(() => {
        const node = document.getElementById(`cell-${shortestPath[i]}`);
        if (node) {
          node.classList.remove('node-visited');
          node.classList.add('node-shortest-path');
        }
      }, pathDelay + (30 * i)); // 30ms per path node
      animationTimeouts.current.push(timeout);
    }
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
      <FloatingMenu onClearWalls={clearWalls} onVisualizeAStar={visualizeAStar}/>

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
