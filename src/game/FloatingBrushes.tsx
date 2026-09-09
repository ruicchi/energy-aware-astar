import { useMemo, memo } from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { FloatingPanel } from "./FloatingPanel";
import { TerrainBrushControls } from "./controls/TerrainBrushControls";
import { UI_CONFIG } from "../config/simulationConfig";

export const FloatingBrushes = memo(function FloatingBrushes() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTiny = useMediaQuery("(max-width:400px)");
  const panelWidth = isMobile
    ? isTiny
      ? UI_CONFIG.panelWidth.tiny
      : UI_CONFIG.panelWidth.mobile
    : UI_CONFIG.panelWidth.default;

  const initialPosition = useMemo(
    () => ({
      x:
        typeof window !== "undefined"
          ? Math.max(
              UI_CONFIG.initialPosition.x,
              window.innerWidth - panelWidth - UI_CONFIG.initialPosition.x,
            )
          : 800,
      y: UI_CONFIG.initialPosition.y,
    }),
    [panelWidth],
  );

  return (
    <FloatingPanel
      title="Brushes"
      initialPosition={initialPosition}
      width={panelWidth}
      collapsible
    >
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        <TerrainBrushControls />
      </Box>
    </FloatingPanel>
  );
});
