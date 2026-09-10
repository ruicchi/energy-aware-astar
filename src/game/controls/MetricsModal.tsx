import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import { FloatingPanel } from "../FloatingPanel";
import { useSimulationSelector } from "../simulationHooks";
import { UI_CONFIG, THEME_CONFIG } from "../../config/simulationConfig";

interface MetricsModalProps {
  onClose: () => void;
}

export function MetricsModal({ onClose }: MetricsModalProps) {
  const pathMetrics = useSimulationSelector((s) => s.pathMetrics);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (!pathMetrics) return null;

  const energyPerUnit =
    pathMetrics.distance > 0 ? pathMetrics.energy / pathMetrics.distance : 0;
  const energyBreakdown = pathMetrics.energyBreakdown;

  return (
    <FloatingPanel
      title="Calculation"
      initialPosition={{
        x: isMobile ? UI_CONFIG.initialPosition.x : 240,
        y: 240,
      }}
      zIndex={UI_CONFIG.zIndex.modal}
      elevation={UI_CONFIG.elevation.modal}
      width={isMobile ? UI_CONFIG.panelWidth.metricsMobile : UI_CONFIG.panelWidth.metrics}
      maxWidth="calc(100vw - 24px)"
      onClose={onClose}
    >
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box>
          <Typography variant="caption" color="textSecondary" display="block">
            Heuristic
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {pathMetrics.algorithm}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" color="textSecondary" display="block">
            Distance
          </Typography>
          <Typography variant="body2">{pathMetrics.distance.toFixed(2)} units</Typography>
        </Box>

        <Box>
          <Typography variant="caption" color="textSecondary" display="block">
            Energy Consumed
          </Typography>
          <Typography variant="body2">{pathMetrics.energy.toFixed(2)} units</Typography>
        </Box>

        <Box sx={{ borderTop: `1px solid ${THEME_CONFIG.panelHeaderBorderColor}`, pt: 1 }}>
          <Typography variant="caption" color="textSecondary" display="block">
            Energy / distance
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {energyPerUnit.toFixed(2)} energy / unit
          </Typography>
        </Box>

        {energyBreakdown && (
          <Box sx={{ borderTop: `1px solid ${THEME_CONFIG.panelHeaderBorderColor}`, pt: 1 }}>
            <Typography variant="caption" color="textSecondary" display="block">
              Energy Breakdown
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                mt: 0.5,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="caption">Straight movement</Typography>
                <Typography variant="caption" fontWeight="bold">
                  {energyBreakdown.straightMovement.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="caption">Diagonal movement</Typography>
                <Typography variant="caption" fontWeight="bold">
                  {energyBreakdown.diagonalMovement.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="caption">Turn cost</Typography>
                <Typography variant="caption" fontWeight="bold">
                  {energyBreakdown.turnCost.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="caption">Dirt penalty</Typography>
                <Typography variant="caption" fontWeight="bold">
                  {energyBreakdown.dirtPenalty.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="caption">Water penalty</Typography>
                <Typography variant="caption" fontWeight="bold">
                  {energyBreakdown.waterPenalty.toFixed(2)}
                </Typography>
              </Box>
              {energyBreakdown.otherTerrainPenalty !== 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography variant="caption">Other terrain</Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {energyBreakdown.otherTerrainPenalty.toFixed(2)}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="caption">Climbing cost</Typography>
                <Typography variant="caption" fontWeight="bold">
                  {energyBreakdown.climbingCost.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="caption">Stability penalty</Typography>
                <Typography variant="caption" fontWeight="bold">
                  {energyBreakdown.stabilityPenalty.toFixed(2)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1,
                  borderTop: `1px dashed ${THEME_CONFIG.panelHeaderBorderColor}`,
                  mt: 0.5,
                  pt: 0.5,
                }}
              >
                <Typography variant="caption">Evaluated nodes</Typography>
                <Typography variant="caption" fontWeight="bold">
                  {energyBreakdown.nodesEvaluated}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </FloatingPanel>
  );
}
