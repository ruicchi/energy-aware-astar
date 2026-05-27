import type { RefObject, Dispatch, SetStateAction } from "react";

/**
 * Updates the visual state of a grid cell directly in the DOM.
 * Used to provide lag-free feedback during wall drawing/erasing.
 *
 * @param key - The unique cell identifier ("row-col")
 * @param isWall - Whether the cell should be styled as a wall
 */
export const updateCellVisuals = (key: string, isWall: boolean) => {
  const element = document.getElementById(`cell-${key}`);
  if (!element) return;

  element.style.backgroundColor = isWall ? "#1a88e2" : "";
  if (isWall) {
    element.classList.add("is-wall");
  } else {
    element.classList.remove("is-wall");
  }
};

/**
 * Clears all walls from the grid, resetting both the state and the DOM.
 *
 * @param wallNodeRef - Ref to the set of current wall nodes
 * @param modifiedCellsRef - Ref tracking cells modified during the current interaction
 * @param setwallNode - React state setter for the official wall node set
 */
export const clearWalls = (
  wallNodeRef: RefObject<Set<string>>,
  modifiedCellsRef: RefObject<Set<string>>,
  setwallNode: Dispatch<SetStateAction<Set<string>>>,
) => {
  // Ensure the ref is not null before accessing current
  if (!wallNodeRef.current || !modifiedCellsRef.current) return;

  // Reset all wall visuals
  wallNodeRef.current.forEach((key: string) => {
    updateCellVisuals(key, false);
  });

  // Clear tracking data
  wallNodeRef.current.clear();
  modifiedCellsRef.current.clear();

  // Update official React state
  setwallNode(new Set());
};
