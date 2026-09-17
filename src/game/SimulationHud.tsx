import { useState, useMemo, useCallback, memo } from "react";
import { Box, Divider } from "@mui/material";
import { useViewport } from "../hooks/useViewport";
import { FloatingPanel } from "./FloatingPanel";
import { ScenarioControls } from "./controls/ScenarioControls";
import { PlanningControls } from "./controls/PlanningControls";
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
  const [isManualOpen, setIsManualOpen] = useState(true);

  const viewport = useViewport();

  const openMetrics = useCallback(() => setIsMetricsOpen(true), []);
  const closeMetrics = useCallback(() => setIsMetricsOpen(false), []);
  const closeManual = useCallback(() => setIsManualOpen(false), []);

  const hudContextValue = useMemo<HudContextValue>(
    () => ({
      isMetricsOpen,
      openMetrics,
      closeMetrics,
    }),
    [isMetricsOpen, openMetrics, closeMetrics],
  );

  const layout = useMemo(
    () => resolveHudLayout(viewport.width, viewport.isMobile, viewport.isTiny),
    [viewport.width, viewport.isMobile, viewport.isTiny],
  );

  return (
    <HudContext.Provider value={hudContextValue}>
      {/* Simulation Controls: Scenarios and Path Planning */}
      <FloatingPanel
        title="Controls"
        initialPosition={layout.controls.initialPosition}
        width={layout.controls.width}
        collapsible
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <ScenarioControls />
          <Divider sx={{ my: 0.5 }} />
          <PlanningControls onOpenResults={openMetrics} />
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
      {isManualOpen && (
        <FloatingPanel
          title="Manual"
          initialPosition={layout.manual.initialPosition}
          width={layout.manual.width}
          onClose={closeManual}
        >
          <SimulationManual />
        </FloatingPanel>
      )}

      {/* Pop-Out Metrics Modal */}
      {isMetricsOpen && (
        <FloatingPanel
          title="Metrics"
          initialPosition={layout.metrics.initialPosition}
          zIndex={layout.metrics.zIndex}
          elevation={layout.metrics.elevation}
          width={layout.metrics.width}
          onClose={closeMetrics}
        >
          <MetricsModal />
        </FloatingPanel>
      )}
    </HudContext.Provider>
  );
});
