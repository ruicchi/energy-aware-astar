import { useState, useEffect } from "react";
import { GRID_CONFIG } from "../config/simulationConfig";

/**
 * Custom hook that tracks the current window viewport dimensions.
 * Implementation includes a debounce to prevent performance bottlenecks
 * when resizing the window, which is especially important for grid-based layouts.
 *
 * @returns An object containing the current `width` and `height` of the window.
 */
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    /**
     * Updates the viewport state with a debounce.
     */
    function onResize() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, GRID_CONFIG.resizeDebounceMs);
    }

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return viewport;
};
