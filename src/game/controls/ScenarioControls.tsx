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
import { useSimulationControls } from "../simulationHooks";
import { SCENARIO_PRESETS, type ScenarioPresetId } from "../../data";

type ScenarioKey = "freeform" | ScenarioPresetId | "procedural";

function resolveActiveScenarioKey(
  isFixedDimensions: boolean,
  loadedScenarioName: string | null,
): ScenarioKey {
  if (!isFixedDimensions || !loadedScenarioName) {
    return "freeform";
  }
  if (loadedScenarioName.startsWith("Seed #")) {
    return "procedural";
  }
  const preset = SCENARIO_PRESETS.find((p) => p.name === loadedScenarioName);
  return preset ? preset.id : "freeform";
}

export function ScenarioControls() {
  const { engine, isFixedDimensions, isLocked, loadedScenarioName } = useSimulationControls();

  const [seed, setSeed] = useState<number>(1);

  const activeKey: ScenarioKey = resolveActiveScenarioKey(isFixedDimensions, loadedScenarioName);

  function handleSelectChange(e: SelectChangeEvent<ScenarioKey>) {
    const key = e.target.value as ScenarioKey;
    if (key === "freeform") {
      engine.resetToFreeform();
    } else if (key === "procedural") {
      engine.loadProcedural(seed);
    } else {
      engine.loadPreset(key);
    }
  }

  function handleSeedChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextSeed = Math.max(1, parseInt(e.target.value, 10) || 1);
    setSeed(nextSeed);
    if (activeKey === "procedural") {
      engine.loadProcedural(nextSeed);
    }
  }

  function handleRandomSeed() {
    const randomSeed = Math.floor(Math.random() * 9999) + 1;
    setSeed(randomSeed);
    engine.loadProcedural(randomSeed);
  }

  function handleReload() {
    if (activeKey === "procedural") {
      engine.loadProcedural(seed);
    } else if (activeKey !== "freeform") {
      engine.loadPreset(activeKey);
    } else {
      engine.resetToFreeform();
    }
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
        fullWidth
        value={activeKey}
        onChange={handleSelectChange}
        onPointerDown={(e) => e.stopPropagation()}
        sx={{
          fontSize: "12px",
        }}
      >
        <MenuItem value="freeform" sx={{ fontSize: "12px" }}>
          Freeform
        </MenuItem>
        {SCENARIO_PRESETS.map((preset) => (
          <MenuItem key={preset.id} value={preset.id} sx={{ fontSize: "12px" }}>
            {preset.label}
          </MenuItem>
        ))}
        <MenuItem value="procedural" sx={{ fontSize: "12px" }}>
          Monte Carlo Seed (1-50)
        </MenuItem>
      </Select>

      {activeKey === "procedural" && (
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
