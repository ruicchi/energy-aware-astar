import Box from "@mui/material/Box";
import { SimulationHud } from "./SimulationHud";
import { SimulationCanvas } from "./SimulationCanvas";

/**
 * Backwards-compatible viewport shell.
 * Coordinates HUD overlays and the deep SimulationCanvas module.
 */
export function GameGrid() {
  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        userSelect: "none",
        position: "relative",
        touchAction: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SimulationHud />
      <SimulationCanvas />
    </Box>
  );
}

export default GameGrid;
