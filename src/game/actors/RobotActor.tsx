import { memo, useLayoutEffect } from "react";
import Box from "@mui/material/Box";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import type { Heading } from "../../shared/types";
import { THEME_CONFIG, UI_CONFIG, getHeadingRotation } from "../../config/simulationConfig";

export interface RobotActorProps {
  robotNode: string;
  cellSize: number;
  robotHeading: Heading;
  isDragging: boolean;
  isWalking: boolean;
  onMouseDown: (key: string) => void;
}

export const RobotActor = memo(
  function RobotActor({
    robotNode,
    cellSize,
    robotHeading,
    isDragging,
    isWalking,
    onMouseDown,
  }: RobotActorProps) {
    const parts = robotNode.split("-");
    const row = Number(parts[0]);
    const col = Number(parts[1]);

    useLayoutEffect(() => {
      if (typeof document === "undefined") return;
      const node = document.getElementById("robot-actor");
      if (node && !isWalking) {
        node.style.transition = "none";
        node.style.transform = `translate3d(${col * cellSize}px, ${row * cellSize}px, 0)`;
      }
    }, [row, col, cellSize, isWalking]);

    return (
      <Box
        id="robot-actor"
        data-testid="robot-actor"
        onMouseDown={(e) => {
          if (isWalking) return;
          e.stopPropagation();
          onMouseDown(robotNode);
        }}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: cellSize,
          height: cellSize,
          backgroundColor: THEME_CONFIG.robotColor,
          zIndex: UI_CONFIG.zIndex.actors,
          pointerEvents: isDragging || isWalking ? "none" : "auto",
          cursor: isDragging ? "grabbing" : "grab",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxSizing: "border-box",
          border: `1px solid ${THEME_CONFIG.actorBorderColor}`,
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <ArrowForwardIcon
          id="robot-actor-arrow"
          style={{
            transform: `rotate(${getHeadingRotation(robotHeading)})`,
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
