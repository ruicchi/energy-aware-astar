import { Box, Typography } from "@mui/material";
import { usePathMetrics } from "../simulationHooks";
import { THEME_CONFIG } from "../../config/simulationConfig";

export interface MetricsModalProps {
  onClose?: () => void;
}

/**
 * Pure presentation view rendering path calculation metrics and energy breakdown.
 * Layout chrome, positioning, and dialog lifecycle are managed by SimulationHud.
 */
export function MetricsModal() {
  const pathMetrics = usePathMetrics();

  if (!pathMetrics) return null;

  const energyPerUnit = pathMetrics.distance > 0 ? pathMetrics.energy / pathMetrics.distance : 0;
  const energyBreakdown = pathMetrics.energyBreakdown;

  return (
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

      <Box
        sx={{
          borderTop: `1px solid ${THEME_CONFIG.panelHeaderBorderColor}`,
          pt: 1,
        }}
      >
        <Typography variant="caption" color="textSecondary" display="block">
          Energy / distance
        </Typography>
        <Typography variant="body2">{energyPerUnit.toFixed(2)} energy / unit</Typography>
      </Box>

      <Box
        sx={{
          borderTop: `1px solid ${THEME_CONFIG.panelHeaderBorderColor}`,
          pt: 1,
        }}
      >
        <Typography variant="caption" color="textSecondary" display="block">
          Safety
        </Typography>
        <Typography variant="body2">
          {pathMetrics.isSafe ? "Safe" : `Unsafe (${pathMetrics.safetyFailureReason})`}
        </Typography>
      </Box>

      {energyBreakdown && (
        <Box
          sx={{
            borderTop: `1px solid ${THEME_CONFIG.panelHeaderBorderColor}`,
            pt: 1,
          }}
        >
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
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
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
              }}
            >
              <Typography variant="caption">Nodes expanded</Typography>
              <Typography variant="caption" fontWeight="bold">
                {energyBreakdown.nodesExpanded ?? energyBreakdown.nodesEvaluated}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="caption">Nodes generated</Typography>
              <Typography variant="caption" fontWeight="bold">
                {energyBreakdown.nodesGenerated ?? 0}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
