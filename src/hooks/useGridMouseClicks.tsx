import { useState, useCallback, useRef } from 'react';

// Define the different dragging actions possible
type DragMode = 'wall' | 'robot' | 'destination' | null;

export const useGridMouseClicks = (
  initialRobot: string,
  initialDest: string,
) => {
  const [wallNode, setwallNode] = useState<Set<string>>(new Set());
  const [robotNode, setRobotNode] = useState(initialRobot);
  const [destinationNode, setDestinationNode] = useState(initialDest);

  const isDrawing = useRef(false);
  const drawValue = useRef(false);
  const dragMode = useRef<DragMode>(null);

  const wallNodeRef = useRef<Set<string>>(new Set());

  const toggleWallState = useCallback((key: string, isInitialClick: boolean) => {
    let isDrawingWall = drawValue.current;
    
    // Check if drawing or erasing
    if (isInitialClick) {
      isDrawingWall = !wallNodeRef.current.has(key);
      drawValue.current = isDrawingWall;
    } else if (isDrawingWall === wallNodeRef.current.has(key)) {
      return; // Quick exit
    }

    // Update our silent Ref instead of State!
    if (isDrawingWall) {
      wallNodeRef.current.add(key);
    } else {
      wallNodeRef.current.delete(key);
    }

        // INSTANTLY update the color on the screen to prevent lag
    const element = document.getElementById(`cell-${key}`);
    if (element) {
      // Change 'transparent' to ''
      element.style.backgroundColor = isDrawingWall ? '#1a88e2' : ''; 
    }
  }, []);

  const clearWalls = useCallback(() => {
    // 1. Visually reset all the current walls back to transparent
    wallNodeRef.current.forEach((key) => {
      const element = document.getElementById(`cell-${key}`);
      if (element) {
        element.style.backgroundColor = '';
      }
    });

    // 2. Clear our silent tracking Ref
    wallNodeRef.current.clear();
    
    // 3. Clear the official React state
    setwallNode(new Set());
  }, []);

    const handleMouseDown = useCallback((key: string) => {
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
        // Call the reusable function and pass true for the initial click!
        toggleWallState(key, true);
        break;
    }
  }, [robotNode, destinationNode, toggleWallState]); 

  const handleMouseEnter = useCallback(
    (key: string) => {
      if (!isDrawing.current) return;

      switch (dragMode.current) {
        case 'robot':
          // Don't drag robot on top of destination or walls
          if (key !== destinationNode && !wallNode.has(key)) {
            setRobotNode(key);
          }
          break;

        case 'destination':
          // Don't drag destination on top of robot or walls
          if (key !== robotNode && !wallNode.has(key)) {
            setDestinationNode(key);
          }
          break;

        case 'wall':
          // Don't paint walls over robot or destination
          if (key === robotNode || key === destinationNode) break;
            toggleWallState(key, false)
          break;
      }
    },
    [robotNode, destinationNode, wallNode, toggleWallState],
  ); // Added wallNode to dependencies

    const handleMouseUp = useCallback(() => {
    if (isDrawing.current && dragMode.current === 'wall') {
      // Sync the final drawing to React state ONLY when you finish dragging
      setwallNode(new Set(wallNodeRef.current)); 
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
    clearWalls,
  };
};
