import { Box, Typography, Button } from "@mui/material";
import {
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
import type { Heading } from "../../shared/types";
import { useSimulation } from "../SimulationContext";

const HEADINGS: Heading[] = [
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

const ICON_MAP: Record<Heading, React.ReactNode> = {
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

export function HeadingControls() {
  const { robotHeading, setRobotHeading, selectedAlgo } = useSimulation();
  const isEnergyAware = selectedAlgo === "energyAware";

  return (
    <Box
      sx={{
        mt: 1,
        borderTop: "1px solid rgba(0,0,0,0.1)",
        pt: 1,
        opacity: !isEnergyAware ? 0.5 : 1,
        pointerEvents: !isEnergyAware ? "none" : "auto",
      }}
    >
      <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: "block" }}>
        Initial Heading
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
        }}
      >
        {HEADINGS.map((h) => (
          <Button
            key={h}
            variant={robotHeading === h ? "contained" : "outlined"}
            color={h === "NONE" ? "error" : "secondary"}
            size="small"
            sx={{
              minWidth: 0,
              p: 0.5,
              aspectRatio: "1/1",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setRobotHeading(h)}
          >
            {ICON_MAP[h]}
          </Button>
        ))}
      </Box>
    </Box>
  );
};
