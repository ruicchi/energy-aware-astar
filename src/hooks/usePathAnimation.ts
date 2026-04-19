import { useRef, useState, useCallback } from 'react'

export type VisitedNode = { key: string; type: "open" | "closed" };

export const usePathAnimation = (robotNode: string, destinationNode: string) => {
  const [isManhattanFinished, setIsManhattanFinished] = useState<boolean>(false);
  const [isEnergyFinished, setIsEnergyFinished] = useState<boolean>(false);
  const [showManhattanSearch, setShowManhattanSearch] = useState<boolean>(true);
  const [showEnergySearch, setShowEnergySearch] = useState<boolean>(true);

  const animationTimeouts = useRef<number[]>([]);

  const clearAnimations = useCallback((onClear?: () => void) => {
    animationTimeouts.current.forEach(clearTimeout);
    animationTimeouts.current = [];

    setIsManhattanFinished(false);
    setIsEnergyFinished(false);
    setShowManhattanSearch(true);
    setShowEnergySearch(true);
    
    if (onClear) onClear()

    document
      .querySelectorAll(
        ".node-visited, .node-open, .node-shortest-path, .node-energy-visited, .node-energy-open, .node-energy-shortest-path",
      )
      .forEach((el) => {
        el.classList.remove(
          "node-visited",
          "node-open",
          "node-shortest-path",
          "node-energy-visited",
          "node-energy-open",
          "node-energy-shortest-path",
        );
      });
  }, []);

  const animateResult = useCallback((
    visitedNodesInOrder: VisitedNode[],
    shortestPath: string[],
    visitedClass: string = "node-visited",
    openClass: string = "node-open",
    pathClass: string = "node-shortest-path",
  ): number => {
    // 3. Animate Visited/Open Nodes
    for (let i = 0; i < visitedNodesInOrder.length; i++) {
      const timeout = setTimeout(() => {
        const { key, type } = visitedNodesInOrder[i];
        if (key === robotNode || key === destinationNode) return;

        const node = document.getElementById(`cell-${key}`);
        if (node) {
          if (type === "closed") {
            node.classList.remove(openClass);
            node.classList.add(visitedClass);
          } else if (type === "open") {
            node.classList.add(openClass);
          }
        }
      }, 10 * i); // 10ms per node
      animationTimeouts.current.push(timeout as unknown as number);
    }

    // 4. Animate Shortest Path after visited nodes finish
    const pathDelay = visitedNodesInOrder.length * 10;
    for (let i = 0; i < shortestPath.length; i++) {
      // Don't overwrite the start and destination node colors
      if (shortestPath[i] === robotNode || shortestPath[i] === destinationNode) continue;

      const timeout = setTimeout(
        () => {
          const node = document.getElementById(`cell-${shortestPath[i]}`);
          if (node) {
            node.classList.remove(visitedClass);
            node.classList.remove(openClass);
            node.classList.add(pathClass);
          }
        },
        pathDelay + 30 * i,
      ); // 30ms per path node
      animationTimeouts.current.push(timeout as unknown as number);
    }

    return pathDelay + shortestPath.length * 30;
  }, [robotNode, destinationNode]);

  const addTimeout = useCallback((t: number) => {
    animationTimeouts.current.push(t)
  }, [])

  return {
    isManhattanFinished,
    setIsManhattanFinished,
    isEnergyFinished,
    setIsEnergyFinished,
    showManhattanSearch,
    setShowManhattanSearch,
    showEnergySearch,
    setShowEnergySearch,
    clearAnimations,
    animateResult,
    addTimeout
  }
}
