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

  const clearWalls = useCallback(() => {
    setwallNode(new Set());
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
          // Otherwise, we are drawing walls
          dragMode.current = 'wall';
          setwallNode((prev) => {
            const nextValue = !prev.has(key);
            drawValue.current = nextValue;

            const next = new Set(prev);
            if (nextValue) next.add(key);
            else next.delete(key);
            return next;
          });
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

          setwallNode((prev) => {
            if (drawValue.current === prev.has(key)) return prev;
            const next = new Set(prev);
            if (drawValue.current) next.add(key);
            else next.delete(key);
            return next;
          });
          break;
      }
    },
    [robotNode, destinationNode, wallNode],
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
