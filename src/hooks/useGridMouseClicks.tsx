import { useState, useCallback, useRef } from 'react';

//study
export const useGridMouseClicks = () => {
  const [activeCells, setActiveCells] = useState<Set<string>>(new Set());
  
  const isDrawing = useRef(false);
  const drawValue = useRef(false);

  const handleMouseDown = useCallback((key: string) => {
    isDrawing.current = true;

    setActiveCells((prev) => {
      const nextValue = !prev.has(key);
      drawValue.current = nextValue;
      
      const next = new Set(prev);
      if (nextValue) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const handleMouseEnter = useCallback((key: string) => {
    if (!isDrawing.current) return;
    
    setActiveCells((prev) => {
      if (drawValue.current === prev.has(key)) return prev;

      const next = new Set(prev);
      if (drawValue.current) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  return {
    activeCells,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  };
};