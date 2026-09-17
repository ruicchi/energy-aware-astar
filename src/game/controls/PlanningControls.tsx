import { Box, Typography, Button, IconButton, Tooltip } from "@mui/material";
import {
  OpenInNew,
  North,
  South,
  East,
  West,
  NorthEast,
  NorthWest,
  SouthEast,
  SouthWest,
  Block,
} from "@mui/icons-material";
import type { Heading, AlgorithmType } from "../../shared/types";
import { THEME_CONFIG } from "../../config/simulationConfig";
import { useSimulationControls } from "../simulationHooks";
import { useHud } from "../hudContext";

const HEADINGS: readonly Heading[] = [
  "UP_LEFT",
  "UP",
  "UP_RIGHT",
  "LEFT",
  "NONE",
  "RIGHT",
  "DOWN_LEFT",
  "DOWN",
  "DOWN_RIGHT",
];

const HEADING_ICONS: Record<Heading, React.ReactNode> = {
  UP: <North fontSize="small" />,
  DOWN: <South fontSize="small" />,
  LEFT: <West fontSize="small" />,
  RIGHT: <East fontSize="small" />,
  UP_LEFT: <NorthWest fontSize="small" />,
  UP_RIGHT: <NorthEast fontSize="small" />,
  DOWN_LEFT: <SouthWest fontSize="small" />,
  DOWN_RIGHT: <SouthEast fontSize="small" />,
  NONE: <Block fontSize="small" />,
};

export interface PlanningControlsProps {
  onOpenResults?: () => void;
}

/**
 * Deep PlanningControls module.
 * Consolidates heuristic search policy selection, kinematic vehicle heading invariants,
 * visualization execution triggers, search exploration toggles, and results telemetry.
 */
export function PlanningControls({ onOpenResults }: PlanningControlsProps = {}) {
  const hud = useHud();
  const handleOpenResults = onOpenResults ?? hud.openMetrics;

  const {
    engine,
    selectedAlgo,
    use3DStandard,
    robotHeading,
    isEnergyAware,
    isManhattanFinished,
    isEnergyFinished,
    showManhattanSearch,
    showEnergySearch,
    hasPath,
    pathMetrics,
    isWalking,
    walkFailure,
    isLocked,
  } = useSimulationControls();

  const algorithms: { type: AlgorithmType; label: string }[] = [
    { type: "energyAware", label: "Energy-Aware" },
    { type: "manhattan", label: "Manhattan" },
    { type: "euclidean", label: "Euclidean" },
    { type: "octile", label: "Octile" },
    { type: "chebyshev", label: "Chebyshev" },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        pointerEvents: isLocked ? "none" : "auto",
        opacity: isLocked ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Search Policy Selection */}
      <Typography
        variant="caption"
        color="textSecondary"
        align="left"
        sx={{ mb: 0.5, display: "block" }}
      >
        Heuristic
      </Typography>

      {algorithms.map((algo) => (
        <Button
          key={algo.type}
          variant={selectedAlgo === algo.type ? "contained" : "outlined"}
          color="primary"
          fullWidth
          size="small"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => engine.setSelectedAlgo(algo.type)}
        >
          {algo.label}
        </Button>
      ))}

      {/* 3D-Aware Standard Heuristics Toggle */}
      <Box
        sx={{
          mt: 0.5,
          borderTop: `1px solid ${THEME_CONFIG.panelHeaderBorderColor}`,
          pt: 1,
          opacity: isEnergyAware ? 0.45 : 1,
          pointerEvents: isEnergyAware ? "none" : "auto",
          transition: "opacity 0.2s",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 0.75,
          }}
        >
          <Typography variant="caption" color="textSecondary">
            Elevation Aware (3D)
          </Typography>
        </Box>
        <Button
          variant={use3DStandard ? "contained" : "outlined"}
          color={use3DStandard ? "primary" : "primary"}
          fullWidth
          size="small"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => engine.toggleUse3DStandard()}
        >
          {use3DStandard ? "ON" : "OFF"}
        </Button>
      </Box>

      {/* Initial Vehicle Heading Orientation */}
      <Box
        sx={{
          mt: 0.5,
          borderTop: `1px solid ${THEME_CONFIG.panelHeaderBorderColor}`,
          pt: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 0.75,
          }}
        >
          <Typography variant="caption" color="textSecondary">
            Initial Heading
          </Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 0.75,
          }}
        >
          {HEADINGS.map((h) => (
            <Button
              key={h}
              variant={robotHeading === h ? "contained" : "outlined"}
              color={h === "NONE" ? "error" : "primary"}
              size="small"
              sx={{
                minWidth: 0,
                p: 0.5,
                aspectRatio: "1/1",
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => engine.setRobotHeading(h)}
            >
              {HEADING_ICONS[h]}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Execution Commands */}
      <Button
        variant="contained"
        color="success"
        fullWidth
        size="small"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => engine.visualize(selectedAlgo)}
        sx={{ mt: 0.5 }}
      >
        Visualize
      </Button>

      {hasPath && (
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="small"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => engine.walk()}
          sx={{ mt: 0.5 }}
        >
          {isWalking ? "Walking" : "Walk Path"}
        </Button>
      )}

      {/* Search Map Visibility Toggles */}
      {(isManhattanFinished || isEnergyFinished) && (
        <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {isManhattanFinished && (
            <Button
              variant={showManhattanSearch ? "contained" : "outlined"}
              size="small"
              fullWidth
              color="primary"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => engine.toggleManhattanSearch()}
            >
              {showManhattanSearch ? "Hide Search Map" : "Show Search Map"}
            </Button>
          )}
          {isEnergyFinished && (
            <Button
              variant={showEnergySearch ? "contained" : "outlined"}
              size="small"
              fullWidth
              color="primary"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => engine.toggleEnergySearch()}
            >
              {showEnergySearch ? "Hide Search Map" : "Show Search Map"}
            </Button>
          )}
        </Box>
      )}

      {/* Results Telemetry Display */}
      {pathMetrics && (
        <Box
          sx={{
            mt: 1,
            p: 1,
            backgroundColor: "rgba(0,0,0,0.05)",
            borderRadius: 1,
            textAlign: "left",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 0.5,
            }}
          >
            <Typography variant="body2" fontWeight="bold">
              Results:
            </Typography>
            <Tooltip title="Pop out results">
              <IconButton
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleOpenResults}
              >
                <OpenInNew fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="caption" display="block">
            Heuristic: {pathMetrics.algorithm}
          </Typography>
          <Typography variant="caption" display="block">
            Distance: {pathMetrics.distance.toFixed(2)} units
          </Typography>
          <Typography variant="caption" display="block">
            Energy: {pathMetrics.energy.toFixed(2)} units
          </Typography>
          <Typography variant="caption" display="block">
            Nodes Expanded:{" "}
            {pathMetrics.energyBreakdown.nodesExpanded ??
              pathMetrics.energyBreakdown.nodesEvaluated}
          </Typography>
          <Typography variant="caption" display="block">
            Nodes Generated: {pathMetrics.energyBreakdown.nodesGenerated ?? 0}
          </Typography>
          {pathMetrics.isSafe !== undefined && (
            <Typography variant="caption" display="block">
              Safety: {pathMetrics.isSafe ? "Safe" : "Unsafe"}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
