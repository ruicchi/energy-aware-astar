import { useState, useMemo, memo } from "react";
import { Box, Divider, useTheme, useMediaQuery } from "@mui/material";
import { FloatingPanel } from "./FloatingPanel";
import { ScenarioControls } from "./controls/ScenarioControls";
import { HeuristicControls } from "./controls/HeuristicControls";
import { HeadingControls } from "./controls/HeadingControls";
import { TerrainBrushControls } from "./controls/TerrainBrushControls";
import { SimulationManual } from "./controls/SimulationManual";
import { MetricsModal } from "./controls/MetricsModal";
import { resolveHudLayout } from "./hudLayout";

/**
 * Unified Heads-Up Display (HUD) overlay module.
 * Consolidates controls, terrain tools, instructional manual, and calculation metrics modal
 * into a single coordinated layout seam with responsive positioning.
 */
export const SimulationHud = memo(function SimulationHud() {
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTiny = useMediaQuery("(max-width:400px)");

  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const layout = useMemo(
    () => resolveHudLayout(windowWidth, isMobile, isTiny),
    [windowWidth, isMobile, isTiny],
  );

  return (
    <>
      {/* Simulation Controls: Scenarios, Heuristics, Initial Heading */}
      <FloatingPanel
        title="Controls"
        initialPosition={layout.controls.initialPosition}
        width={layout.controls.width}
        collapsible
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <ScenarioControls />
          <Divider sx={{ my: 0.5 }} />
          <HeuristicControls onOpenResults={() => setIsResultsOpen(true)} />
          <HeadingControls />
        </Box>
      </FloatingPanel>

      {/* Terrain Tool Ribbon: Brushes, Sliders, Clear & Reset */}
      <FloatingPanel
        title="Brushes"
        initialPosition={layout.brushes.initialPosition}
        width={layout.brushes.width}
        collapsible
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <TerrainBrushControls />
        </Box>
      </FloatingPanel>

      {/* Interactive Guide: Step-by-Step Instructions */}
      <FloatingPanel
        title="Manual"
        initialPosition={layout.manual.initialPosition}
        width={layout.manual.width}
        maxWidth={layout.manual.maxWidth}
        collapsible
      >
        <SimulationManual />
      </FloatingPanel>

      {/* Pop-Out Calculation Metrics Modal */}
      {isResultsOpen && <MetricsModal onClose={() => setIsResultsOpen(false)} />}
    </>
  );
});
