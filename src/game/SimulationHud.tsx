import { useState, useMemo, useCallback, memo } from "react";
import { Box, Divider, useTheme, useMediaQuery } from "@mui/material";
import { useViewport } from "../hooks/useViewport";
import { FloatingPanel } from "./FloatingPanel";
import { ScenarioControls } from "./controls/ScenarioControls";
import { HeuristicControls } from "./controls/HeuristicControls";
import { HeadingControls } from "./controls/HeadingControls";
import { TerrainBrushControls } from "./controls/TerrainBrushControls";
import { SimulationManual } from "./controls/SimulationManual";
import { MetricsModal } from "./controls/MetricsModal";
import { resolveHudLayout } from "./hudLayout";
import { HudContext, type HudContextValue } from "./hudContext";

/**
 * Unified Heads-Up Display (HUD) overlay module.
 * Deep seam that consolidates controls, terrain tools, instructional manual,
 * and calculation metrics modal into a coordinated layout with reactive positioning.
 */
export const SimulationHud = memo(function SimulationHud() {
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const viewport = useViewport();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTiny = useMediaQuery("(max-width:400px)");

  const openMetrics = useCallback(() => setIsMetricsOpen(true), []);
  const closeMetrics = useCallback(() => setIsMetricsOpen(false), []);

  const hudContextValue = useMemo<HudContextValue>(
    () => ({
      isMetricsOpen,
      openMetrics,
      closeMetrics,
    }),
    [isMetricsOpen, openMetrics, closeMetrics],
  );

  const layout = useMemo(
    () => resolveHudLayout(viewport.width, isMobile, isTiny),
    [viewport.width, isMobile, isTiny],
  );

  return (
    <HudContext.Provider value={hudContextValue}>
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
          <HeuristicControls />
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
      {isMetricsOpen && (
        <FloatingPanel
          title="Calculation"
          initialPosition={layout.metrics.initialPosition}
          zIndex={layout.metrics.zIndex}
          elevation={layout.metrics.elevation}
          width={layout.metrics.width}
          maxWidth={layout.metrics.maxWidth}
          onClose={closeMetrics}
        >
          <MetricsModal />
        </FloatingPanel>
      )}
    </HudContext.Provider>
  );
});
