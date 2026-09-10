import type { Scenario } from "../../shared/types";
import { flatTerrainScenario } from "./flatTerrain";
import { elevatedTerrainScenario } from "./elevatedTerrain";
import { frictionTerrainScenario, mixedTerrainScenario } from "./mixedTerrain";

export type ScenarioPresetId = "case1" | "case2" | "case3" | "case4";

export interface ScenarioPresetDescriptor {
  id: ScenarioPresetId;
  name: string;
  label: string;
  scenario: Scenario;
}

export const SCENARIO_PRESETS: readonly ScenarioPresetDescriptor[] = [
  {
    id: "case1",
    name: "Flat Obstacles",
    label: "1: Flat Obstacles",
    scenario: flatTerrainScenario,
  },
  {
    id: "case2",
    name: "Steep Ridge",
    label: "2: Steep Ridge",
    scenario: elevatedTerrainScenario,
  },
  {
    id: "case3",
    name: "Mud & Water",
    label: "3: Mud & Water",
    scenario: frictionTerrainScenario,
  },
  {
    id: "case4",
    name: "Mixed Hazard",
    label: "4: Mixed Hazard",
    scenario: mixedTerrainScenario,
  },
] as const;

export function getScenarioPreset(id: ScenarioPresetId): ScenarioPresetDescriptor | undefined {
  return SCENARIO_PRESETS.find((preset) => preset.id === id);
}
