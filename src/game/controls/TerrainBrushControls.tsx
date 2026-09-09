import { Box, Typography, Button, Tooltip, Slider } from "@mui/material";
import { TERRAIN_CONFIG } from "../../config/simulationConfig";
import { useSimulation } from "../SimulationContext";

export function TerrainBrushControls() {
  const {
    activeBrush,
    setActiveBrush,
    dirtBrushValue,
    setDirtBrushValue,
    waterBrushValue,
    setWaterBrushValue,
    elevationBrushValue,
    setElevationBrushValue,
    showGradients,
    toggleGradients,
    clearWalls,
    resetSimulation,
  } = useSimulation();

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
        }}
      >
        <Button
          variant="contained"
          size="small"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setActiveBrush("wall")}
          sx={{
            backgroundColor: TERRAIN_CONFIG.types.wall.color,
            color: "#ffffff",
            fontWeight: "bold",
            border: activeBrush === "wall" ? "2.5px solid #111827" : "2.5px solid transparent",
            boxShadow: activeBrush === "wall" ? 4 : 1,
            "&:hover": {
              backgroundColor: TERRAIN_CONFIG.types.wall.color,
              filter: "brightness(0.92)",
            },
          }}
        >
          Wall
        </Button>

        <Tooltip title={`Penalty factor: ${dirtBrushValue}`} arrow>
          <Button
            variant="contained"
            size="small"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setActiveBrush("dirt")}
            sx={{
              backgroundColor: TERRAIN_CONFIG.types.dirt.color,
              color: "#3e2723",
              fontWeight: "bold",
              border: activeBrush === "dirt" ? "2.5px solid #111827" : "2.5px solid transparent",
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

        <Tooltip title={`Penalty factor: ${waterBrushValue}`} arrow>
          <Button
            variant="contained"
            size="small"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setActiveBrush("water")}
            sx={{
              backgroundColor: TERRAIN_CONFIG.types.water.color,
              color: "#004d40",
              fontWeight: "bold",
              border: activeBrush === "water" ? "2.5px solid #111827" : "2.5px solid transparent",
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
          onClick={() => setActiveBrush("elevation")}
          sx={{
            backgroundColor: TERRAIN_CONFIG.getElevationColor(elevationBrushValue),
            color: "#ffffff",
            fontWeight: "bold",
            border: activeBrush === "elevation" ? "2.5px solid #111827" : "2.5px solid transparent",
            boxShadow: activeBrush === "elevation" ? 4 : 1,
            "&:hover": {
              backgroundColor: TERRAIN_CONFIG.getElevationColor(elevationBrushValue),
              filter: "brightness(0.92)",
            },
          }}
        >
          Elevation
        </Button>
      </Box>

      {/* Dirt Slider */}
      {activeBrush === "dirt" && (
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
              Dirt Penalty: {dirtBrushValue}
            </Typography>
            <Slider
              size="small"
              value={dirtBrushValue}
              min={0.1}
              max={5}
              step={0.1}
              marks={[
                { value: 0.1, label: "0.1" },
                { value: 1, label: "1" },
                { value: 2.5, label: "2.5" },
                { value: 5, label: "5" },
              ]}
              onChange={(_, value) => setDirtBrushValue(Number((value as number).toFixed(1)))}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </Box>
        </Box>
      )}

      {/* Water Slider */}
      {activeBrush === "water" && (
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
              Water Penalty: {waterBrushValue}
            </Typography>
            <Slider
              size="small"
              value={waterBrushValue}
              min={0.1}
              max={5}
              step={0.1}
              marks={[
                { value: 0.1, label: "0.1" },
                { value: 1, label: "1" },
                { value: 2.5, label: "2.5" },
                { value: 5, label: "5" },
              ]}
              onChange={(_, value) => setWaterBrushValue(Number((value as number).toFixed(1)))}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </Box>
        </Box>
      )}

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
              Brush Height: {elevationBrushValue}
            </Typography>
            <Slider
              size="small"
              value={elevationBrushValue}
              min={1}
              max={10}
              step={1}
              marks
              onChange={(_, value) => setElevationBrushValue(value as number)}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </Box>
          <Button
            variant={showGradients ? "contained" : "outlined"}
            size="small"
            fullWidth
            color="secondary"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleGradients}
          >
            {showGradients ? "Hide Gradients" : "Show Gradients"}
          </Button>
        </Box>
      )}

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
          onPointerDown={(e) => e.stopPropagation()}
          onClick={clearWalls}
        >
          Clear
        </Button>
        <Button
          variant="contained"
          color="warning"
          fullWidth
          size="small"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={resetSimulation}
        >
          Reset
        </Button>
      </Box>
    </Box>
  );
};
