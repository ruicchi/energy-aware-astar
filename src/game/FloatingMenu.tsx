import { useState, memo } from "react";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { FloatingPanel } from "./FloatingPanel";
import { HeuristicControls } from "./controls/HeuristicControls";
import { HeadingControls } from "./controls/HeadingControls";
import { MetricsModal } from "./controls/MetricsModal";

export const FloatingMenu = memo(function FloatingMenu() {
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTiny = useMediaQuery("(max-width:400px)");

  return (
    <>
      <FloatingPanel
        title="Controls"
        initialPosition={{ x: 20, y: 20 }}
        width={isMobile ? (isTiny ? 160 : 180) : 200}
        collapsible
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <HeuristicControls onOpenResults={() => setIsResultsOpen(true)} />
          <HeadingControls />
        </Box>
      </FloatingPanel>

      {isResultsOpen && <MetricsModal onClose={() => setIsResultsOpen(false)} />}
    </>
  );
});
