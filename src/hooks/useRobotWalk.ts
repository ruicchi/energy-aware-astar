import { useState, useCallback } from "react";
import { type Heading, type Scenario } from "../shared/types";
import { isTraversableSlope } from "../algorithms/utils";

export const useRobotWalk = (
  initialHeading: Heading,
  setRobotHeading: (h: Heading) => void,
  addTimeout: (t: number) => void,
) => {
  const [currentPath, setCurrentPath] = useState<string[] | null>(null);
  const [walkingStep, setWalkingStep] = useState<number>(-1);
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [hasFinishedWalking, setHasFinishedWalking] = useState<boolean>(false);
  const [walkFailure, setWalkFailure] = useState<{
    row: number;
    col: number;
    reason: string;
  } | null>(null);

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

  const handleWalkPath = useCallback(
    (scenario: Scenario) => {
      if (!currentPath || currentPath.length === 0 || isWalking) return;

      setIsWalking(true);
      setHasFinishedWalking(false);
      setWalkFailure(null);
      setWalkingStep(0);

      let cumulativeDelay = 0;
      let currentRobotHeading: Heading = initialHeading;

      for (let i = 0; i < currentPath.length; i++) {
        // 1. Check for stability/traversability if moving to next node
        if (i > 0) {
          const [prevR, prevC] = currentPath[i - 1].split("-").map(Number);
          const [currR, currC] = currentPath[i].split("-").map(Number);
          const nextHeading = getHeadingFromNodes(currentPath[i - 1], currentPath[i]);

          // Safety Check: Use the full energy-aware traversability logic
          const isSafe = isTraversableSlope(
            { row: prevR, col: prevC },
            { row: currR, col: currC, heading: nextHeading },
            scenario,
          );

          if (!isSafe) {
            // Failure State: Stop at the last safe cell and end walking
            const failTimeout = setTimeout(() => {
              setIsWalking(false);
              setHasFinishedWalking(true);
              setWalkFailure({
                row: currR,
                col: currC,
                reason: "ROBOT TIPPED OVER / STEEP SLOPE",
              });
            }, cumulativeDelay);
            addTimeout(failTimeout as unknown as number);
            break; // Stop scheduling further steps
          }

          if (
            currentRobotHeading !== "NONE" &&
            nextHeading !== "NONE" &&
            nextHeading !== currentRobotHeading
          ) {
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
            // Delay finishing the walking state so the last transition can complete
            const finishTimeout = setTimeout(() => {
              setIsWalking(false);
              setHasFinishedWalking(true);
            }, 200);
            addTimeout(finishTimeout as unknown as number);
          }
        }, cumulativeDelay);

        addTimeout(moveTimeout as unknown as number);

        // Standard movement time
        cumulativeDelay += 200;
      }
    },
    [currentPath, isWalking, initialHeading, setRobotHeading, addTimeout],
  );

  const clearWalkState = useCallback(() => {
    setCurrentPath(null);
    setWalkingStep(-1);
    setIsWalking(false);
    setHasFinishedWalking(false);
    setWalkFailure(null);
  }, []);

  return {
    currentPath,
    setCurrentPath,
    walkingStep,
    isWalking,
    hasFinishedWalking,
    walkFailure,
    handleWalkPath,
    clearWalkState,
  };
};
