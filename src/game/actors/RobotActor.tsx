import { memo } from "react";
import Box from "@mui/material/Box";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import type { Heading } from "../../shared/types";
import { THEME_CONFIG, getHeadingRotation } from "../../config/simulationConfig";

export interface RobotActorProps {
  robotNode: string;
  cellSize: number;
  robotHeading: Heading;
  isDragging: boolean;
  isWalking: boolean;
  hasFinishedWalking: boolean;
  walkingStep: number;
  currentPath: string[] | null;
  onMouseDown: (key: string) => void;
}

export const RobotActor = memo(
  function RobotActor({
    robotNode,
    cellSize,
    robotHeading,
    isDragging,
    isWalking,
    hasFinishedWalking,
    walkingStep,
    currentPath,
    onMouseDown,
  }: RobotActorProps) {
    let row = 0;
    let col = 0;

    if (
      (isWalking || hasFinishedWalking) &&
      currentPath &&
      walkingStep >= 0 &&
      walkingStep < currentPath.length
    ) {
      const parts = currentPath[walkingStep].split("-");
      row = Number(parts[0]);
      col = Number(parts[1]);
    } else {
      const parts = robotNode.split("-");
      row = Number(parts[0]);
      col = Number(parts[1]);
    }

    return (
      <Box
        id="robot-actor"
        data-testid="robot-actor"
        onMouseDown={(e) => {
          if (isWalking) return;
          e.stopPropagation();
          onMouseDown(robotNode);
        }}
        style={{
          transform: `translate3d(${col * cellSize}px, ${row * cellSize}px, 0)`,
          transition: isWalking ? "transform 0.2s linear" : "none",
          willChange: isWalking ? "transform" : "auto",
        }}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: cellSize,
          height: cellSize,
          backgroundColor: THEME_CONFIG.robotColor,
          zIndex: 10,
          pointerEvents: isDragging || isWalking ? "none" : "auto",
          cursor: isDragging ? "grabbing" : "grab",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxSizing: "border-box",
          border: "1px solid rgba(0, 0, 0, 0.2)",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <ArrowForwardIcon
          id="robot-actor-arrow"
          style={{
            transform: `rotate(${getHeadingRotation(robotHeading)})`,
            transition: "transform 0.2s ease-in-out",
            display: robotHeading && robotHeading !== "NONE" ? "block" : "none",
          }}
          sx={{
            fontSize: cellSize * 0.8,
            color: "#ffffff",
            pointerEvents: "none",
          }}
        />
      </Box>
    );
  },
);
