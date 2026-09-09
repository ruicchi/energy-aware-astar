import { useMemo, memo } from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { FloatingPanel } from "./FloatingPanel";
import { TerrainBrushControls } from "./controls/TerrainBrushControls";

export const FloatingBrushes = memo(function FloatingBrushes() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTiny = useMediaQuery("(max-width:400px)");
  const panelWidth = isMobile ? (isTiny ? 160 : 180) : 200;

  const initialPosition = useMemo(
    () => ({
      x: typeof window !== "undefined" ? Math.max(20, window.innerWidth - panelWidth - 20) : 800,
      y: 20,
    }),
    [panelWidth]
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
