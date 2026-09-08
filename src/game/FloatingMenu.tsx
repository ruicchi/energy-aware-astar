import { useState, useRef } from "react";
import {
  Paper,
  Typography,
  Button,
  Box,
  IconButton,
  Collapse,
  Slider,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import {
  ExpandMore,
  ExpandLess,
  OpenInNew,
  Close,
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

import { useSimulation } from "./SimulationContext";
import { TERRAIN_CONFIG } from "../config/simulationConfig";

export const FloatingMenu = () => {
  const {
    clearWalls: onClearWalls,
    visualize,
    resetSimulation: onReset,
    selectedAlgo,
    handleSelectAlgo: onSelectAlgo,
    activeBrush,
    setActiveBrush: onSelectBrush,
    elevationBrushValue: elevationValue,
    setElevationBrushValue: onElevationChange,
    pathMetrics,
    isManhattanFinished,
    isEnergyFinished,
    showManhattanSearch,
    showEnergySearch,
    toggleManhattanSearch: onToggleManhattanSearch,
    toggleEnergySearch: onToggleEnergySearch,
    showGradients,
    toggleGradients: onToggleGradients,
    walkPath: onWalkPath,
    hasPath,
    isWalking,
    walkFailure,
    robotHeading: currentHeading,
    setRobotHeading: onHeadingChange,
    isLocked,
  } = useSimulation();

  const onVisualize = () => visualize(selectedAlgo);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTiny = useMediaQuery("(max-width:400px)");

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [resultsPosition, setResultsPosition] = useState({
    x: isMobile ? 20 : 240,
    y: 240,
  });
  const [isResultsDragging, setIsResultsDragging] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  const [isExpanded, setIsExpanded] = useState(true);

  const dragStart = useRef({ x: 0, y: 0 });
  const resultsDragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;

    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleResultsPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;

    setIsResultsDragging(true);
    resultsDragStart.current = {
      x: e.clientX - resultsPosition.x,
      y: e.clientY - resultsPosition.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResultsPointerMove = (e: React.PointerEvent) => {
    if (!isResultsDragging) return;
    setResultsPosition({
      x: e.clientX - resultsDragStart.current.x,
      y: e.clientY - resultsDragStart.current.y,
    });
  };

  const handleResultsPointerUp = (e: React.PointerEvent) => {
    setIsResultsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const energyPerUnit =
    pathMetrics && pathMetrics.distance > 0 ? pathMetrics.energy / pathMetrics.distance : 0;
  const energyBreakdown = pathMetrics?.energyBreakdown;

  return (
    <>
      <Paper
        elevation={4}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        sx={{
          position: "absolute",
          top: position.y,
          left: position.x,
          zIndex: 1000,
          backgroundColor: "rgba(255, 255, 255, 0.4)",
          borderRadius: 2,
          width: isMobile ? (isTiny ? 160 : 180) : 200,
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1.5,
            borderBottom: isExpanded ? "1px solid rgba(0, 0, 0, 0.1)" : "none",
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Controls
          </Typography>

          {/* Toggle Button */}
          <IconButton
            size="small"
            onClick={() => setIsExpanded(!isExpanded)}
            onPointerDown={(e) => e.stopPropagation()} // don't drag when clicking toggle
          >
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        {/* The drop-down content */}
        <Collapse in={isExpanded}>
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
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
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ mb: 0.5, display: "block" }}
              >
                Select Heuristic
              </Typography>

              <Button
                variant={selectedAlgo === "energyAware" ? "contained" : "outlined"}
                color="primary"
                fullWidth
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelectAlgo("energyAware")}
              >
                Energy-Aware
              </Button>

              <Button
                variant={selectedAlgo === "manhattan" ? "contained" : "outlined"}
                color="primary"
                fullWidth
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelectAlgo("manhattan")}
              >
                Manhattan
              </Button>

              <Button
                variant={selectedAlgo === "euclidean" ? "contained" : "outlined"}
                color="primary"
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelectAlgo("euclidean")}
              >
                Euclidean
              </Button>
              <Button
                variant={selectedAlgo === "octile" ? "contained" : "outlined"}
                color="primary"
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelectAlgo("octile")}
              >
                Octile
              </Button>

              <Button
                variant={selectedAlgo === "chebyshev" ? "contained" : "outlined"}
                color="primary"
                size="small"
                fullWidth
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelectAlgo("chebyshev")}
              >
                Chebyshev
              </Button>

              <Button
                variant="contained"
                color="success"
                fullWidth
                sx={{ mt: 1, py: 1, fontWeight: "bold" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onVisualize}
              >
                Visualize
              </Button>

              {/* Search Map Toggles */}
              {(isManhattanFinished || isEnergyFinished) && (
                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {isManhattanFinished && (
                    <Button
                      variant={showManhattanSearch ? "contained" : "outlined"}
                      size="small"
                      fullWidth
                      color="secondary"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={onToggleManhattanSearch}
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
                      onClick={onToggleEnergySearch}
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
                      onClick={onWalkPath}
                      sx={{ mt: 1 }}
                    >
                      {isWalking ? "Walking..." : "Walk Path"}
                    </Button>
                  )}
                </Box>
              )}

              {/* Metrics Display */}
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
                        onClick={() => setIsResultsOpen(true)}
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
                        animation: "pulse 2s infinite",
                      }}
                    >
                      <Typography variant="caption" color="error" fontWeight="bold">
                        ⚠️ PATH EXECUTION FAILED
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: "9px" }}>
                        Reason: {walkFailure.reason}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: "9px" }}>
                        Location: [{walkFailure.row}, {walkFailure.col}]
                      </Typography>
                      <style>{`
                        @keyframes pulse {
                          0% { opacity: 1 }
                          50% { opacity: 0.6 }
                          100% { opacity: 1 }
                        }
                      `}</style>
                    </Box>
                  )}
                </Box>
              )}

              {/* Robot Heading Config */}
              <Box
                sx={{
                  mt: 1,
                  borderTop: "1px solid rgba(0,0,0,0.1)",
                  pt: 1,
                  opacity: selectedAlgo !== "energyAware" ? 0.5 : 1,
                  pointerEvents: selectedAlgo !== "energyAware" ? "none" : "auto",
                }}
              >
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ mb: 1, display: "block" }}
                >
                  Initial Heading
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 1,
                  }}
                >
                  {(
                    [
                      "UP_LEFT",
                      "UP",
                      "UP_RIGHT",
                      "LEFT",
                      "NONE",
                      "RIGHT",
                      "DOWN_LEFT",
                      "DOWN",
                      "DOWN_RIGHT",
                    ] as Heading[]
                  ).map((h) => {
                    const iconMap: Record<Heading, React.ReactNode> = {
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

                    return (
                      <Button
                        key={h}
                        variant={currentHeading === h ? "contained" : "outlined"}
                        color={h === "NONE" ? "error" : "secondary"}
                        size="small"
                        sx={{
                          minWidth: 0,
                          p: 0.5,
                          aspectRatio: "1/1",
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => onHeadingChange(h)}
                      >
                        {iconMap[h]}
                      </Button>
                    );
                  })}
                </Box>
              </Box>

              <Box sx={{ mt: 1, borderTop: "1px solid rgba(0,0,0,0.1)", pt: 1 }}>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ mb: 1, display: "block" }}
                >
                  Brushes
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: isTiny ? "1fr" : "1fr 1fr",
                    gap: 1,
                  }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onSelectBrush("wall")}
                    sx={{
                      backgroundColor: TERRAIN_CONFIG.types.wall.color,
                      color: "#ffffff",
                      fontWeight: "bold",
                      border:
                        activeBrush === "wall" ? "2.5px solid #111827" : "2.5px solid transparent",
                      boxShadow: activeBrush === "wall" ? 4 : 1,
                      "&:hover": {
                        backgroundColor: TERRAIN_CONFIG.types.wall.color,
                        filter: "brightness(0.92)",
                      },
                    }}
                  >
                    Wall
                  </Button>

                  <Tooltip title="Penalty factor: 0.5" arrow>
                    <Button
                      variant="contained"
                      size="small"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onSelectBrush("dirt")}
                      sx={{
                        backgroundColor: TERRAIN_CONFIG.types.dirt.color,
                        color: "#3e2723",
                        fontWeight: "bold",
                        border:
                          activeBrush === "dirt"
                            ? "2.5px solid #111827"
                            : "2.5px solid transparent",
                        boxShadow: activeBrush === "dirt" ? 4 : 1,
                        "&:hover": {
                          backgroundColor: TERRAIN_CONFIG.types.dirt.color,
                          filter: "brightness(0.92)",
                        },
                      }}
                    >
                      Dirt
                    </Button>
                  </Tooltip>

                  <Tooltip title="Penalty factor: 0.1" arrow>
                    <Button
                      variant="contained"
                      size="small"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onSelectBrush("water")}
                      sx={{
                        backgroundColor: TERRAIN_CONFIG.types.water.color,
                        color: "#004d40",
                        fontWeight: "bold",
                        border:
                          activeBrush === "water"
                            ? "2.5px solid #111827"
                            : "2.5px solid transparent",
                        boxShadow: activeBrush === "water" ? 4 : 1,
                        "&:hover": {
                          backgroundColor: TERRAIN_CONFIG.types.water.color,
                          filter: "brightness(0.92)",
                        },
                      }}
                    >
                      Water
                    </Button>
                  </Tooltip>

                  <Button
                    variant="contained"
                    size="small"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onSelectBrush("elevation")}
                    sx={{
                      backgroundColor: TERRAIN_CONFIG.getElevationColor(elevationValue),
                      color: "#ffffff",
                      fontWeight: "bold",
                      border:
                        activeBrush === "elevation"
                          ? "2.5px solid #111827"
                          : "2.5px solid transparent",
                      boxShadow: activeBrush === "elevation" ? 4 : 1,
                      "&:hover": {
                        backgroundColor: TERRAIN_CONFIG.getElevationColor(elevationValue),
                        filter: "brightness(0.92)",
                      },
                    }}
                  >
                    Elevation
                  </Button>
                </Box>

                {/* Elevation Slider */}
                {activeBrush === "elevation" && (
                  <Box
                    sx={{
                      px: 1,
                      mt: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Brush Height: {elevationValue}
                      </Typography>
                      <Slider
                        size="small"
                        value={elevationValue}
                        min={1}
                        max={10}
                        step={1}
                        marks
                        onChange={(_, value) => onElevationChange(value as number)}
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                    </Box>
                    <Button
                      variant={showGradients ? "contained" : "outlined"}
                      size="small"
                      fullWidth
                      color="secondary"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={onToggleGradients}
                    >
                      {showGradients ? "Hide Gradients" : "Show Gradients"}
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Clear and Reset Actions */}
              <Box
                sx={{
                  mt: 1,
                  borderTop: "1px solid rgba(0, 0, 0, 0.1)",
                  pt: 1,
                  display: "flex",
                  gap: 1,
                }}
              >
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  size="small"
                  onPointerDown={(e) => e.stopPropagation()} // don't drag when clicking button
                  onClick={onClearWalls}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  fullWidth
                  size="small"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onReset}
                >
                  Reset
                </Button>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Paper>

      {pathMetrics && isResultsOpen && (
        <Paper
          elevation={6}
          onPointerDown={handleResultsPointerDown}
          onPointerMove={handleResultsPointerMove}
          onPointerUp={handleResultsPointerUp}
          sx={{
            position: "absolute",
            top: resultsPosition.y,
            left: resultsPosition.x,
            zIndex: 1100,
            width: isMobile ? 220 : 280,
            maxWidth: "calc(100vw - 24px)",
            backgroundColor: "rgba(255, 255, 255, 0.5)",
            borderRadius: 2,
            overflow: "hidden",
            cursor: isResultsDragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
        >
          <Box
            sx={{
              p: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              Calculation
            </Typography>
            <Tooltip title="Close">
              <IconButton
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setIsResultsOpen(false)}
              >
                <Close fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>

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

            <Box sx={{ borderTop: "1px solid rgba(0,0,0,0.1)", pt: 1 }}>
              <Typography variant="caption" color="textSecondary" display="block">
                Energy / distance
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {energyPerUnit.toFixed(2)} energy / unit
              </Typography>
            </Box>

            {energyBreakdown && (
              <Box sx={{ borderTop: "1px solid rgba(0,0,0,0.1)", pt: 1 }}>
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
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography variant="caption">Straight movement</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.straightMovement.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography variant="caption">Diagonal movement</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.diagonalMovement.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography variant="caption">Turn cost</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.turnCost.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography variant="caption">Dirt penalty</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.dirtPenalty.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
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
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography variant="caption">Climbing cost</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.climbingCost.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
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
                      borderTop: "1px dashed rgba(0,0,0,0.1)",
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
        </Paper>
      )}
    </>
  );
};
