//# Builds the grid cell
import Box from '@mui/material/Box';
import { useMemo, useRef } from 'react';
import {
  useViewport,
  useGridMouseClicks,
  MemoizedCell,
  FloatingMenu,
  runAStarManhattan,
  runAStarEnergyAware,
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

  const currentRunId = useRef<number>(0);

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

  //* Keep track of timeouts so we can cancel them if needed
  const animationTimeouts = useRef<number[]>([]);

  const clearAnimations = () => {
    animationTimeouts.current.forEach(clearTimeout);
    animationTimeouts.current = [];

    document
      .querySelectorAll('.node-visited, .node-open, .node-shortest-path, .node-energy-visited, .node-energy-open, .node-energy-shortest-path')
      .forEach((el) => {
        el.classList.remove(
          'node-visited', 'node-open', 'node-shortest-path',
          'node-energy-visited', 'node-energy-open', 'node-energy-shortest-path'
        );
      });
  };

  type VisitedNode = { key: string; type: 'open' | 'closed' };

  const animateResult = (
    visitedNodesInOrder: VisitedNode[],
    shortestPath: string[],
    visitedClass: string = 'node-visited',
    openClass: string = 'node-open',
    pathClass: string = 'node-shortest-path'
  ) => {
    // 3. Animate Visited/Open Nodes
    for (let i = 0; i < visitedNodesInOrder.length; i++) {
      const timeout = setTimeout(() => {
        const { key, type } = visitedNodesInOrder[i];
        const node = document.getElementById(`cell-${key}`);
        if (node) {
          if (type === 'closed') {
            node.classList.remove(openClass);
            node.classList.add(visitedClass);
          } else if (type === 'open') {
            node.classList.add(openClass);
          }
        }
      }, 10 * i); // 10ms per node
      animationTimeouts.current.push(timeout);
    }

    // 4. Animate Shortest Path after visited nodes finish
    const pathDelay = visitedNodesInOrder.length * 10;
    for (let i = 0; i < shortestPath.length; i++) {
      // Don't overwrite the start and destination node colors
      if (shortestPath[i] === robotNode || shortestPath[i] === destinationNode)
        continue;

      const timeout = setTimeout(
        () => {
          const node = document.getElementById(`cell-${shortestPath[i]}`);
          if (node) {
            node.classList.remove(visitedClass);
            node.classList.remove(openClass);
            node.classList.add(pathClass);
          }
        },
        pathDelay + 30 * i,
      ); // 30ms per path node
      animationTimeouts.current.push(timeout);
    }
  };

  const visualizeAStar = () => {
    clearAnimations();
    const { visitedNodesInOrder, shortestPath } = runAStarManhattan(
      rows,
      cols,
      robotNode,
      destinationNode,
      wallNode,
    );
    animateResult(visitedNodesInOrder, shortestPath, 'node-visited', 'node-open', 'node-shortest-path');
  };

  const visualizeEnergyAwareAStar = () => {
    clearAnimations();

    // Create a mock scenario since we don't have full terrain/elevation UI yet
    const scenario = {
      rows,
      cols,
      robotNode,
      destinationNode,
      wallNodes: wallNode,
      terrainFactors: new Map<string, number>(),
      elevations: new Map<string, number>(),
      climbingFactor: 1.5,
      turnPenalty: 2.0,
    };

    const { visitedNodesInOrder, shortestPath } = runAStarEnergyAware(scenario);
    animateResult(visitedNodesInOrder, shortestPath, 'node-energy-visited', 'node-energy-open', 'node-energy-shortest-path');
  };

  const handleReset = () => {
    // 1. Increment run ID to instantly kill any currently running async animations
    currentRunId.current += 1;
    clearAnimations();
    clearWalls();
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
      <FloatingMenu
        onClearWalls={clearWalls}
        onVisualizeAStar={visualizeAStar}
        onVisualizeEnergyAwareAStar={visualizeEnergyAwareAStar}
        onReset={handleReset}
      />

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
