import React from "react";

//* Function to draw or erase walls
export const toggleWallState = (
  key: string,
  isInitialClick: boolean,
  drawValue: React.MutableRefObject<boolean>,
  wallNodeRef: React.MutableRefObject<Set<string>>,
  modifiedCellsRef: React.MutableRefObject<Set<string>>,
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

  //^ INSTANTLY update the color and class on the screen to prevent lag
  const element = document.getElementById(`cell-${key}`);
  if (element) {
    element.style.backgroundColor = isDrawingWall ? "#1a88e2" : "";
    if (isDrawingWall) {
      element.classList.add("is-wall");
    } else {
      element.classList.remove("is-wall");
    }
  }
};

export const clearWalls = (
  wallNodeRef: React.MutableRefObject<Set<string>>,
  modifiedCellsRef: React.MutableRefObject<Set<string>>,
  setwallNode: React.Dispatch<React.SetStateAction<Set<string>>>,
) => {
  wallNodeRef.current.forEach((key: string) => {
    const element = document.getElementById(`cell-${key}`);
    if (element) {
      element.style.backgroundColor = "";
      element.classList.remove("is-wall");
    }
  });

  //* Clears silent tracking ref
  wallNodeRef.current.clear();
  modifiedCellsRef.current.clear();

  //* Clear the official React state
  setwallNode(new Set());
};
