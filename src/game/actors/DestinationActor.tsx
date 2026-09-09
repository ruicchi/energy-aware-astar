import { memo } from "react";
import Box from "@mui/material/Box";
import { THEME_CONFIG } from "../../config/simulationConfig";

export interface DestinationActorProps {
  destinationNode: string;
  cellSize: number;
  isDragging: boolean;
  isWalking: boolean;
  onMouseDown: (key: string) => void;
}

export const DestinationActor = memo(
  ({
    destinationNode,
    cellSize,
    isDragging,
    isWalking,
    onMouseDown,
  }: DestinationActorProps) => {
    const parts = destinationNode.split("-");
    const row = Number(parts[0]);
    const col = Number(parts[1]);

    return (
      <Box
        id="destination-actor"
        data-testid="destination-actor"
        onMouseDown={(e) => {
          if (isWalking) return;
          e.stopPropagation();
          onMouseDown(destinationNode);
        }}
        style={{
          transform: `translate3d(${col * cellSize}px, ${row * cellSize}px, 0)`,
        }}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: cellSize,
          height: cellSize,
          backgroundColor: THEME_CONFIG.destinationColor,
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
      />
    );
  },
);
