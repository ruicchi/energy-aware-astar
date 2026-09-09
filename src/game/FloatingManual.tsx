import { memo } from "react";
import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import { FloatingPanel } from "./FloatingPanel";

export const FloatingManual = memo(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <FloatingPanel
      title="Manual"
      initialPosition={{
        x: isMobile ? 20 : 235,
        y: 20,
      }}
      width={isMobile ? "calc(100vw - 40px)" : 580}
      maxWidth="calc(100vw - 32px)"
      collapsible
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          maxHeight: "calc(100vh - 120px)",
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
      </Box>
    </FloatingPanel>
  );
});
