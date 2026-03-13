import { useState } from 'react';

export const useGridMouseClicks = () => {
  const [activeCells, setActiveCells] = useState<Set<string>>(new Set());
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawValue, setDrawValue] = useState(false);

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

  return {
    activeCells,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  };
};