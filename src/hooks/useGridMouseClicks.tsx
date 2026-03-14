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

    const toggleWallState = useCallback((key: string, isInitialClick: boolean) => {
    setwallNode((prev) => {
      let isDrawingWall = drawValue.current;

      if (isInitialClick) {
        // On initial click, we flip the state of the current cell and lock it in
        isDrawingWall = !prev.has(key);
        drawValue.current = isDrawingWall;
      } else if (isDrawingWall === prev.has(key)) {
        // While dragging, if the cell is already in the correct state, do nothing
        return prev;
      }

      // Create new set and apply the change
      const next = new Set(prev);
      if (isDrawingWall) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const clearWalls = useCallback(() => {
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
