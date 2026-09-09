import { Box, Typography, Button, IconButton, Tooltip } from "@mui/material";
import { OpenInNew } from "@mui/icons-material";
import { useSimulation } from "../SimulationContext";

interface HeuristicControlsProps {
  onOpenResults: () => void;
}

export const HeuristicControls = ({ onOpenResults }: HeuristicControlsProps) => {
  const {
    selectedAlgo,
    handleSelectAlgo,
    visualize,
    isManhattanFinished,
    isEnergyFinished,
    showManhattanSearch,
    showEnergySearch,
    toggleManhattanSearch,
    toggleEnergySearch,
    hasPath,
    isWalking,
    walkPath,
    pathMetrics,
    walkFailure,
    isLocked,
  } = useSimulation();

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
      <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: "block" }}>
        Select Heuristic
      </Typography>

      <Button
        variant={selectedAlgo === "energyAware" ? "contained" : "outlined"}
        color="primary"
        fullWidth
        size="small"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => handleSelectAlgo("energyAware")}
      >
        Energy-Aware
      </Button>

      <Button
        variant={selectedAlgo === "manhattan" ? "contained" : "outlined"}
        color="primary"
        fullWidth
        size="small"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => handleSelectAlgo("manhattan")}
      >
        Manhattan
      </Button>

      <Button
        variant={selectedAlgo === "euclidean" ? "contained" : "outlined"}
        color="primary"
        size="small"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => handleSelectAlgo("euclidean")}
      >
        Euclidean
      </Button>

      <Button
        variant={selectedAlgo === "octile" ? "contained" : "outlined"}
        color="primary"
        size="small"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => handleSelectAlgo("octile")}
      >
        Octile
      </Button>

      <Button
        variant={selectedAlgo === "chebyshev" ? "contained" : "outlined"}
        color="primary"
        size="small"
        fullWidth
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => handleSelectAlgo("chebyshev")}
      >
        Chebyshev
      </Button>

      <Button
        variant="contained"
        color="success"
        fullWidth
        sx={{ mt: 1, py: 1, fontWeight: "bold" }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => visualize(selectedAlgo)}
      >
        Visualize
      </Button>

      {(isManhattanFinished || isEnergyFinished) && (
        <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          {isManhattanFinished && (
            <Button
              variant={showManhattanSearch ? "contained" : "outlined"}
              size="small"
              fullWidth
              color="secondary"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleManhattanSearch}
            >
              {showManhattanSearch ? "Hide Search Map" : "Show Search Map"}
            </Button>
          )}
          {isEnergyFinished && (
            <Button
              variant={showEnergySearch ? "contained" : "outlined"}
              size="small"
              fullWidth
              color="secondary"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleEnergySearch}
            >
              {showEnergySearch ? "Hide Search Map" : "Show Search Map"}
            </Button>
          )}

          {hasPath && (
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onPointerDown={(e) => e.stopPropagation()}
              onClick={walkPath}
              sx={{ mt: 1 }}
            >
              {isWalking ? "Walking..." : "Walk Path"}
            </Button>
          )}
        </Box>
      )}

      {pathMetrics && (
        <Box
          sx={{
            mt: 2,
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
                onClick={onOpenResults}
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
            Evaluated Nodes: {pathMetrics.energyBreakdown.nodesEvaluated}
          </Typography>

          {walkFailure && (
            <Box
              sx={{
                mt: 1.5,
                p: 1,
                backgroundColor: "rgba(244, 67, 54, 0.15)",
                border: "1px solid #f44336",
                borderRadius: 1,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              <Typography variant="caption" color="error" fontWeight="bold">
                FAILED
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "9px" }}>
                {walkFailure.reason}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "9px" }}>
                LOCATION: [{walkFailure.row}, {walkFailure.col}]
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
