import { useState, useCallback } from 'react'
import { type Heading } from '../types'

export const useRobotWalk = (
  initialHeading: Heading,
  setRobotHeading: (h: Heading) => void,
  addTimeout: (t: number) => void
) => {
  const [currentPath, setCurrentPath] = useState<string[] | null>(null);
  const [walkingStep, setWalkingStep] = useState<number>(-1);
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [hasFinishedWalking, setHasFinishedWalking] = useState<boolean>(false);

  const getHeadingFromNodes = (from: string, to: string): Heading => {
    const [r1, c1] = from.split("-").map(Number);
    const [r2, c2] = to.split("-").map(Number);
    const dr = r2 - r1;
    const dc = c2 - c1;

    if (dr === -1 && dc === 0) return "UP";
    if (dr === 1 && dc === 0) return "DOWN";
    if (dr === 0 && dc === -1) return "LEFT";
    if (dr === 0 && dc === 1) return "RIGHT";
    if (dr === -1 && dc === -1) return "UP_LEFT";
    if (dr === -1 && dc === 1) return "UP_RIGHT";
    if (dr === 1 && dc === -1) return "DOWN_LEFT";
    if (dr === 1 && dc === 1) return "DOWN_RIGHT";
    return "NONE";
  };

  const handleWalkPath = useCallback(() => {
    if (!currentPath || currentPath.length === 0 || isWalking) return;

    setIsWalking(true);
    setHasFinishedWalking(false);
    setWalkingStep(0);

    let cumulativeDelay = 0;
    let currentRobotHeading: Heading = initialHeading;

    for (let i = 0; i < currentPath.length; i++) {
      // 1. Check for rotation if we're past the first node
      if (i > 0) {
        const nextHeading = getHeadingFromNodes(currentPath[i - 1], currentPath[i]);

        if (nextHeading !== "NONE" && nextHeading !== currentRobotHeading) {
          // Schedule the rotation
          const rotateTimeout = setTimeout(() => {
            setRobotHeading(nextHeading);
          }, cumulativeDelay);
          addTimeout(rotateTimeout as unknown as number);

          // Pause forward movement for 300ms to let the rotation happen
          cumulativeDelay += 300;
          currentRobotHeading = nextHeading;
        }
      }

      // 2. Schedule the forward movement to this node
      const moveTimeout = setTimeout(() => {
        setWalkingStep(i);

        if (i === currentPath.length - 1) {
          setIsWalking(false);
          setHasFinishedWalking(true);
        }
      }, cumulativeDelay);

      addTimeout(moveTimeout as unknown as number);

      // Standard movement time
      cumulativeDelay += 200;
    }
  }, [currentPath, isWalking, initialHeading, setRobotHeading, addTimeout]);

  const clearWalkState = useCallback(() => {
    setCurrentPath(null);
    setWalkingStep(-1);
    setIsWalking(false);
    setHasFinishedWalking(false);
  }, []);

  return {
    currentPath,
    setCurrentPath,
    walkingStep,
    isWalking,
    hasFinishedWalking,
    handleWalkPath,
    clearWalkState
  }
}
