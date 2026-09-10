import { useState } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Tooltip,
  type SelectChangeEvent,
} from "@mui/material";
import { Casino, Refresh } from "@mui/icons-material";
import { useSimulationEngine, useScenarioState } from "../simulationHooks";
import {
  flatTerrainScenario,
  elevatedTerrainScenario,
  frictionTerrainScenario,
  mixedTerrainScenario,
  generateProceduralScenario,
} from "../../data";

type ScenarioKey = "freeform" | "case1" | "case2" | "case3" | "case4" | "procedural";

export function ScenarioControls() {
  const engine = useSimulationEngine();
  const { isFixedDimensions, isLocked } = useScenarioState();

  const [selectedKey, setSelectedKey] = useState<ScenarioKey>("freeform");
  const [seed, setSeed] = useState<number>(1);

  function applyScenario(key: ScenarioKey, currentSeed = seed) {
    if (key === "freeform") {
      engine.resetToFreeform();
      return;
    }

    if (key === "case1") {
      engine.loadScenario(flatTerrainScenario, {
        name: "Flat Obstacles",
        instantSolve: true,
      });
    } else if (key === "case2") {
      engine.loadScenario(elevatedTerrainScenario, {
        name: "Steep Ridge",
        instantSolve: true,
      });
    } else if (key === "case3") {
      engine.loadScenario(frictionTerrainScenario, {
        name: "Mud & Water",
        instantSolve: true,
      });
    } else if (key === "case4") {
      engine.loadScenario(mixedTerrainScenario, {
        name: "Mixed Hazard",
        instantSolve: true,
      });
    } else if (key === "procedural") {
      const proceduralScenario = generateProceduralScenario({
        seed: currentSeed,
        rows: 25,
        cols: 25,
        numHills: 3,
        numMudPatches: 3,
        obstacleDensity: 0.08,
      });
      engine.loadScenario(proceduralScenario, {
        name: `Seed #${currentSeed}`,
        instantSolve: true,
      });
    }
  }

  function handleSelectChange(e: SelectChangeEvent<ScenarioKey>) {
    const key = e.target.value as ScenarioKey;
    setSelectedKey(key);
    applyScenario(key);
  }

  function handleSeedChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextSeed = Math.max(1, parseInt(e.target.value, 10) || 1);
    setSeed(nextSeed);
    if (selectedKey === "procedural") {
      applyScenario("procedural", nextSeed);
    }
  }

  function handleRandomSeed() {
    const randomSeed = Math.floor(Math.random() * 50) + 1;
    setSeed(randomSeed);
    setSelectedKey("procedural");
    applyScenario("procedural", randomSeed);
  }

  function handleReload() {
    applyScenario(selectedKey);
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        pointerEvents: isLocked ? "none" : "auto",
        opacity: isLocked ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: "block" }}>
          Scenario
        </Typography>
        {isFixedDimensions && (
          <Tooltip title="Reload" arrow>
            <IconButton
              size="small"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleReload}
              sx={{ p: 0.25 }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Select
        size="small"
        value={selectedKey}
        onChange={handleSelectChange}
        onPointerDown={(e) => e.stopPropagation()}
        sx={{
          fontSize: "12px",
          height: 32,
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      >
        <MenuItem value="freeform" sx={{ fontSize: "12px" }}>
          Freeform
        </MenuItem>
        <MenuItem value="case1" sx={{ fontSize: "12px" }}>
          1: Flat Obstacles
        </MenuItem>
        <MenuItem value="case2" sx={{ fontSize: "12px" }}>
          2: Steep Ridge
        </MenuItem>
        <MenuItem value="case3" sx={{ fontSize: "12px" }}>
          3: Mud & Water
        </MenuItem>
        <MenuItem value="case4" sx={{ fontSize: "12px" }}>
          4: Mixed Hazard
        </MenuItem>
        <MenuItem value="procedural" sx={{ fontSize: "12px" }}>
          Monte Carlo Seed (1-50)
        </MenuItem>
      </Select>

      {selectedKey === "procedural" && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mt: 0.25,
          }}
        >
          <TextField
            size="small"
            label="Seed"
            type="number"
            value={seed}
            onChange={handleSeedChange}
            onPointerDown={(e) => e.stopPropagation()}
            slotProps={{
              htmlInput: {
                min: 1,
                max: 9999,
                style: { fontSize: "12px", padding: "4px 8px" },
              },
              inputLabel: { style: { fontSize: "11px" } },
            }}
            sx={{ flex: 1 }}
          />
          <Tooltip title="Random Seed (1–50)" arrow>
            <IconButton
              size="small"
              color="primary"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleRandomSeed}
              sx={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 1 }}
            >
              <Casino fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}
