import { useState, useCallback } from "react";
import type { Heading, Scenario } from "../shared/types";
import { getHeading, isTraversableSlope } from "../physics/terrainPhysics";
import { ANIMATION_CONFIG } from "../config/simulationConfig";

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
          const nextHeading = getHeading(currentPath[i - 1], currentPath[i]);

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
                reason: "ROBOT TIPPED OVER",
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

            // Pause forward movement to let the rotation happen
            cumulativeDelay += ANIMATION_CONFIG.walkRotateDelayMs;
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
            }, ANIMATION_CONFIG.walkStepDelayMs);
            addTimeout(finishTimeout as unknown as number);
          }
        }, cumulativeDelay);

        addTimeout(moveTimeout as unknown as number);

        // Standard movement time
        cumulativeDelay += ANIMATION_CONFIG.walkStepDelayMs;
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
