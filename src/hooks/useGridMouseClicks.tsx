import { useState, useCallback, useRef } from 'react';

// Define the different dragging actions possible
type DragMode = 'wall' | 'robot' | 'destination' | null;

export const useGridMouseClicks = (initialRobot: string, initialDest: string) => {
  const [activeCells, setActiveCells] = useState<Set<string>>(new Set());
  const [robotNode, setRobotNode] = useState(initialRobot);
  const [destinationNode, setDestinationNode] = useState(initialDest);
  
  const isDrawing = useRef(false);
  const drawValue = useRef(false);
  const dragMode = useRef<DragMode>(null);

  const clearWalls = useCallback(() => {
    setActiveCells(new Set());
  }, []);

  const handleMouseDown = useCallback((key: string) => {
    isDrawing.current = true;

    // Check if we clicked on the robot or destination
    if (key === robotNode) {
      dragMode.current = 'robot';
      return;
    }
    
    if (key === destinationNode) {
      dragMode.current = 'destination';
      return;
    }

    // Otherwise, we are drawing walls
    dragMode.current = 'wall';
    setActiveCells((prev) => {
      const nextValue = !prev.has(key);
      drawValue.current = nextValue;
      
      const next = new Set(prev);
      if (nextValue) next.add(key);
      else next.delete(key);
      return next;
    });
  }, [robotNode, destinationNode]);

  const handleMouseEnter = useCallback((key: string) => {
    if (!isDrawing.current) return;
    
    // If dragging the robot, update its position
    if (dragMode.current === 'robot') {
      // Don't drag robot on top of destination
      if (key !== destinationNode) setRobotNode(key);
      return;
    }

    // If dragging the destination, update its position
    if (dragMode.current === 'destination') {
      // Don't drag destination on top of robot
      if (key !== robotNode) setDestinationNode(key);
      return;
    }

    // If drawing walls, paint the cell
    if (dragMode.current === 'wall') {
      // Don't paint walls over robot or destination
      if (key === robotNode || key === destinationNode) return;

      setActiveCells((prev) => {
        if (drawValue.current === prev.has(key)) return prev;
        const next = new Set(prev);
        if (drawValue.current) next.add(key);
        else next.delete(key);
        return next;
      });
    }
  }, [robotNode, destinationNode]);

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
    dragMode.current = null;
  }, []);

  return {
    activeCells,
    robotNode,
    destinationNode,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    clearWalls
  };
};