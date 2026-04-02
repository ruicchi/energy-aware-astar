//* Function to draw or erase walls
export const toggleWallState = (
  key: string,
  isInitialClick: boolean,
  drawValue,
  wallNodeRef,
  modifiedCellsRef,
) => {
  let isDrawingWall = drawValue.current;

  //^ Check if drawing or erasing
  if (isInitialClick) {
    isDrawingWall = !wallNodeRef.current.has(key);
    drawValue.current = isDrawingWall;
  } else if (isDrawingWall === wallNodeRef.current.has(key)) {
    return;
  }

  //^ Update ref instead of state
  if (isDrawingWall) {
    wallNodeRef.current.add(key);
  } else {
    wallNodeRef.current.delete(key);
  }

  modifiedCellsRef.current.add(key);

  //^ INSTANTLY update the color on the screen to prevent lag
  const element = document.getElementById(`cell-${key}`);
  if (element) {
    element.style.backgroundColor = isDrawingWall ? '#1a88e2' : 'transparent';
  }
};

//* function to clear walls
export const clearWalls = (wallNodeRef, modifiedCellsRef, setwallNode) => {
  wallNodeRef.current.forEach((key) => {
    const element = document.getElementById(`cell-${key}`);
    if (element) {
      element.style.backgroundColor = '';
    }
  });

  //* Clears silent tracking ref
  wallNodeRef.current.clear();
  modifiedCellsRef.current.clear();

  //* Clear the official React state
  setwallNode(new Set());
};
