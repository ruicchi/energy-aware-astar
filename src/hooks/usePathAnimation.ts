import { useRef, useState, useCallback } from 'react'

export type VisitedNode = { key: string; type: "open" | "closed" };

export const usePathAnimation = (robotNode: string, destinationNode: string) => {
  const [isManhattanFinished, setIsManhattanFinished] = useState<boolean>(false);
  const [isEnergyFinished, setIsEnergyFinished] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showManhattanSearch, setShowManhattanSearch] = useState<boolean>(true);
  const [showEnergySearch, setShowEnergySearch] = useState<boolean>(true);

  const animationTimeouts = useRef<number[]>([]);

  const clearAnimations = useCallback((onClear?: () => void) => {
    animationTimeouts.current.forEach(clearTimeout);
    animationTimeouts.current = [];

    setIsManhattanFinished(false);
    setIsEnergyFinished(false);
    setIsAnimating(false);
    setShowManhattanSearch(true);
    setShowEnergySearch(true);
    
    if (onClear) onClear()

    document
      .querySelectorAll('[data-manhattan], [data-energy], [data-path]')
      .forEach((el) => {
        const node = el as HTMLElement;
        delete node.dataset.manhattan;
        delete node.dataset.energy;
        delete node.dataset.path;
      });
  }, []);

  const animateResult = useCallback((
    visitedNodesInOrder: VisitedNode[],
    shortestPath: string[],
    mode: "manhattan" | "energy" = "manhattan",
  ): number => {
    const searchAttr = mode === "manhattan" ? "manhattan" : "energy";
    setIsAnimating(true);

    // 3. Animate Visited/Open Nodes
    for (let i = 0; i < visitedNodesInOrder.length; i++) {
      const timeout = setTimeout(() => {
        const { key, type } = visitedNodesInOrder[i];
        if (key === robotNode || key === destinationNode) return;

        const node = document.getElementById(`cell-${key}`);
        if (node) {
          node.dataset[searchAttr] = type; // "open" or "closed"
        }
      }, 10 * i); // 10ms per node
      animationTimeouts.current.push(timeout as unknown as number);
    }

    // 4. Animate Shortest Path after visited nodes finish
    const pathDelay = visitedNodesInOrder.length * 10;
    for (let i = 0; i < shortestPath.length; i++) {
      if (shortestPath[i] === robotNode || shortestPath[i] === destinationNode) continue;

      const timeout = setTimeout(
        () => {
          const node = document.getElementById(`cell-${shortestPath[i]}`);
          if (node) {
            node.dataset.path = mode; // "manhattan" or "energy"
          }
        },
        pathDelay + 30 * i,
      ); // 30ms per path node
      animationTimeouts.current.push(timeout as unknown as number);
    }

    const duration = pathDelay + shortestPath.length * 30;
    
    const finishTimeout = setTimeout(() => {
      setIsAnimating(false);
    }, duration);
    animationTimeouts.current.push(finishTimeout as unknown as number);

    return duration;
  }, [robotNode, destinationNode]);

  const addTimeout = useCallback((t: number) => {
    animationTimeouts.current.push(t)
  }, [])

  return {
    isManhattanFinished,
    setIsManhattanFinished,
    isEnergyFinished,
    setIsEnergyFinished,
    isAnimating,
    showManhattanSearch,
    setShowManhattanSearch,
    showEnergySearch,
    setShowEnergySearch,
    clearAnimations,
    animateResult,
    addTimeout
  } as {
    isManhattanFinished: boolean;
    setIsManhattanFinished: (val: boolean) => void;
    isEnergyFinished: boolean;
    setIsEnergyFinished: (val: boolean) => void;
    isAnimating: boolean;
    showManhattanSearch: boolean;
    setShowManhattanSearch: (val: boolean) => void;
    showEnergySearch: boolean;
    setShowEnergySearch: (val: boolean) => void;
    clearAnimations: (onClear?: () => void) => void;
    animateResult: (visitedNodesInOrder: VisitedNode[], shortestPath: string[], mode?: "manhattan" | "energy") => number;
    addTimeout: (t: number) => void;
  }
}
