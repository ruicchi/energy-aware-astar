import { useState, useCallback, useRef } from 'react';
import { toggleWallState, clearWalls } from '../index';

//* The different dragging actions possible
type DragMode = 'wall' | 'robot' | 'destination' | null;

export const useGridMouseClicks = (
  initialRobot: string,
  initialDest: string,
) => {
  //* Set is used for faster membership checking
  const [wallNode, setwallNode] = useState<Set<string>>(new Set());
  const [robotNode, setRobotNode] = useState(initialRobot);
  const [destinationNode, setDestinationNode] = useState(initialDest);

  //* useRef is used to not trigger re-render on drawing | used for mouse buttons
  const isDrawing = useRef(false);
  const drawValue = useRef(false);
  const dragMode = useRef<DragMode>(null);

  const wallNodeRef = useRef<Set<string>>(new Set());
  const modifiedCellsRef = useRef<Set<string>>(new Set());
  
  const handleClearWalls = useCallback(() => {
    clearWalls(wallNodeRef, modifiedCellsRef, setwallNode);
  }, []);

  const handleMouseDown = useCallback(
    (key: string) => {
      isDrawing.current = true;

      switch (key) {
        case robotNode:
          dragMode.current = 'robot';
          return;
        case destinationNode:
          dragMode.current = 'destination';
          return;
        default:
          dragMode.current = 'wall';
          toggleWallState(key, true, drawValue, wallNodeRef, modifiedCellsRef);
          break;
      }
    },
    [robotNode, destinationNode],
  );

  const handleMouseEnter = useCallback(
    (key: string) => {
      if (!isDrawing.current) return;

      switch (dragMode.current) {
        case 'robot':
          //* Don't drag robot on top of destination or walls
          if (key !== destinationNode && !wallNode.has(key)) {
            setRobotNode(key);
          }
          break;

        case 'destination':
          //* Don't drag destination on top of robot or walls
          if (key !== robotNode && !wallNode.has(key)) {
            setDestinationNode(key);
          }
          break;

        case 'wall':
          //* Don't paint walls over robot or destination
          if (key === robotNode || key === destinationNode) break;
          toggleWallState(key, false, drawValue, wallNodeRef, modifiedCellsRef);
          break;
      }
    },
    [robotNode, destinationNode, wallNode],
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawing.current && dragMode.current === 'wall') {
      //* Sync the final drawing to React state ONLY when you finish dragging
      setwallNode(new Set(wallNodeRef.current));

      //* Clean up temporary inline styles so React takes full control again
      modifiedCellsRef.current.forEach((key) => {
        const element = document.getElementById(`cell-${key}`);
        if (element) {
          element.style.backgroundColor = '';
        }
      });
      modifiedCellsRef.current.clear(); //* Clear the cache
    }

    isDrawing.current = false;
    dragMode.current = null;
  }, []);

  return {
    wallNode,
    robotNode,
    destinationNode,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    clearWalls: handleClearWalls,
  };
};
