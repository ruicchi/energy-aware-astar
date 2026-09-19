import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { LearnMoreModal } from "./LearnMoreModal";

/**
 * Presentation panel rendering step-by-step instructions for interacting with the simulation.
 */
export function SimulationManual() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Box
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          overflowY: "auto",
          lineHeight: 1.0,
          textAlign: "left",
        }}
      >
        <Typography variant="caption" sx={{ fontSize: "inherit", lineHeight: "inherit" }}>
          Click within the white grid and drag your mouse to draw obstacles
        </Typography>
        <Typography variant="caption" sx={{ fontSize: "inherit", lineHeight: "inherit" }}>
          Drag the{" "}
          <Box component="span" sx={{ color: "#2e7d32", fontWeight: "bold" }}>
            green
          </Box>{" "}
          node to set the start position
        </Typography>
        <Typography variant="caption" sx={{ fontSize: "inherit", lineHeight: "inherit" }}>
          Drag the{" "}
          <Box component="span" sx={{ color: "#d32f2f", fontWeight: "bold" }}>
            red
          </Box>{" "}
          node to set the end position
        </Typography>
        <Typography variant="caption" sx={{ fontSize: "inherit", lineHeight: "inherit" }}>
          Select a heuristic from the controls panel
        </Typography>
        <Typography variant="caption" sx={{ fontSize: "inherit", lineHeight: "inherit" }}>
          Click Visualize to start the pathfinding animation
        </Typography>

        <Button
          variant="outlined"
          size="small"
          onClick={() => setOpen(true)}
          sx={{
            mt: 1,
            alignSelf: "flex-start",
            fontSize: "inherit",
            textTransform: "none",
          }}
        >
          Learn more
        </Button>
      </Box>

      <LearnMoreModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
