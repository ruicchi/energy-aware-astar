import { useState, useCallback, useRef, useEffect } from 'react';
import { clearWalls } from '../index';

//* The different dragging actions possible
import type { BrushMode } from '.../index'

export const useGridMouseClicks = (
  initialRobot: string,
  initialDest: string,
  elevationBrushValue: number,
) => {
  //* Set is used for faster membership checking
  const [wallNode, setwallNode] = useState<Set<string>>(new Set());
  const [terrainFactors, setTerrainFactors] = useState<Map<string, number>>(new Map());
  const [elevations, setElevations] = useState<Map<string, number>>(new Map());
  const [robotNode, setRobotNode] = useState(initialRobot);
  const [destinationNode, setDestinationNode] = useState(initialDest);
  const [activeBrush, setActiveBrush] = useState<BrushMode>('wall');

  //* useRef is used to not trigger re-render on drawing | used for mouse buttons
  const isDrawing = useRef(false);
  const drawValue = useRef<number | boolean | null>(null); //* Stores initial value of click to decide if drawing or erasing
  const dragMode = useRef<BrushMode>(null);
  const activeBrushRef = useRef<BrushMode>('wall');
  const activeElevationValueRef = useRef<number>(elevationBrushValue);

  const wallNodeRef = useRef<Set<string>>(new Set());
  const terrainFactorsRef = useRef<Map<string, number>>(new Map());
  const elevationsRef = useRef<Map<string, number>>(new Map());
  const modifiedCellsRef = useRef<Set<string>>(new Set());

  //* Keep refs in sync with state for callbacks to use the latest data
  useEffect(() => {
    activeBrushRef.current = activeBrush;
  }, [activeBrush]);

  useEffect(() => {
    activeElevationValueRef.current = elevationBrushValue;
  }, [elevationBrushValue]);

  useEffect(() => {
    wallNodeRef.current = new Set(wallNode);
  }, [wallNode]);

  useEffect(() => {
    terrainFactorsRef.current = new Map(terrainFactors);
  }, [terrainFactors]);

  useEffect(() => {
    elevationsRef.current = new Map(elevations);
  }, [elevations]);
  
  const handleClearWalls = useCallback(() => {
    clearWalls(wallNodeRef, modifiedCellsRef, setwallNode);
    // Also clear terrain and elevation for a full reset
    terrainFactorsRef.current.clear();
    elevationsRef.current.clear();
    setTerrainFactors(new Map());
    setElevations(new Map());
  }, []);

  const updateCell = useCallback((key: string, mode: BrushMode, value: number | boolean | null) => {
    const element = document.getElementById(`cell-${key}`);
    if (!element) return;

    modifiedCellsRef.current.add(key);

    if (mode === 'wall') {
      if (value) wallNodeRef.current.add(key);
      else wallNodeRef.current.delete(key);
      element.style.backgroundColor = value ? '#1a88e2' : '';
    } else if (mode === 'dirt' || mode === 'water') {
      if (value === 0) terrainFactorsRef.current.delete(key);
      else terrainFactorsRef.current.set(key, value as number);
      
      // Visual feedback for terrain
      if (value === 0.5) element.style.backgroundColor = '#d2b48c'; // Tan for dirt
      else if (value === 2.0) element.style.backgroundColor = '#00ffff'; // Cyan for water
      else element.style.backgroundColor = '';
    } else if (mode === 'elevation') {
      const val = value as number;
      elevationsRef.current.set(key, val);
      // Visual feedback for elevation (darker green for higher)
      const brightness = Math.max(0, 255 - val * 20);
      element.style.backgroundColor = `rgb(0, ${brightness}, 0)`;
    }
  }, []);

  const handleMouseDown = useCallback(
    (key: string) => {
      isDrawing.current = true;

      if (key === robotNode) {
        dragMode.current = 'robot';
        return;
      }
      if (key === destinationNode) {
        dragMode.current = 'destination';
        return;
      }

      const currentBrush = activeBrushRef.current;
      dragMode.current = currentBrush;
      
      // Determine if we are adding or removing based on the first click
      if (currentBrush === 'wall') {
        drawValue.current = !wallNodeRef.current.has(key);
      } else if (currentBrush === 'dirt') {
        drawValue.current = terrainFactorsRef.current.get(key) !== 0.5 ? 0.5 : 0;
      } else if (currentBrush === 'water') {
        drawValue.current = terrainFactorsRef.current.get(key) !== 2.0 ? 2.0 : 0;
      } else if (currentBrush === 'elevation') {
        const current = elevationsRef.current.get(key);
        // Toggle logic: if cell is at target value, clear it. Else, set to target.
        drawValue.current = current === activeElevationValueRef.current ? 0 : activeElevationValueRef.current;
      }

      updateCell(key, dragMode.current, drawValue.current);
    },
    [robotNode, destinationNode, updateCell],
  );

  const handleMouseEnter = useCallback(
    (key: string) => {
      if (!isDrawing.current) return;

      switch (dragMode.current) {
        case 'robot':
          if (key !== destinationNode && !wallNodeRef.current.has(key)) {
            setRobotNode(key);
          }
          break;

        case 'destination':
          if (key !== robotNode && !wallNodeRef.current.has(key)) {
            setDestinationNode(key);
          }
          break;

        case 'wall':
        case 'dirt':
        case 'water':
        case 'elevation':
          if (key === robotNode || key === destinationNode) break;
          updateCell(key, dragMode.current, drawValue.current);
          break;
      }
    },
    [robotNode, destinationNode, updateCell],
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawing.current) {
      if (dragMode.current === 'wall') {
        setwallNode(new Set(wallNodeRef.current));
      } else if (dragMode.current === 'dirt' || dragMode.current === 'water') {
        setTerrainFactors(new Map(terrainFactorsRef.current));
      } else if (dragMode.current === 'elevation') {
        setElevations(new Map(elevationsRef.current));
      }

      //* Clean up temporary inline styles so React takes full control again
      modifiedCellsRef.current.forEach((key) => {
        const element = document.getElementById(`cell-${key}`);
        if (element) {
          element.style.backgroundColor = '';
        }
      });
      modifiedCellsRef.current.clear();
    }

    isDrawing.current = false;
    dragMode.current = null;
    drawValue.current = null;
  }, []);

  return {
    wallNode,
    terrainFactors,
    elevations,
    robotNode,
    destinationNode,
    activeBrush,
    setActiveBrush,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    clearWalls: handleClearWalls,
  };
};
