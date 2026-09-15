import { describe, it, expect } from "vitest";
import { resolveHudLayout } from "./hudLayout";
import { UI_CONFIG } from "../config/simulationConfig";

describe("SimulationHud - resolveHudLayout", () => {
  it("computes desktop layout coordinates correctly", () => {
    const layout = resolveHudLayout(1200, false, false);

    expect(layout.isMobile).toBe(false);
    expect(layout.isTiny).toBe(false);

    // Controls panel
    expect(layout.controls.width).toBe(UI_CONFIG.panelWidth.default);
    expect(layout.controls.initialPosition).toEqual({ x: 20, y: 20 });

    // Brushes panel clamped to right margin
    expect(layout.brushes.width).toBe(UI_CONFIG.panelWidth.default);
    expect(layout.brushes.initialPosition).toEqual({
      x: 1200 - UI_CONFIG.panelWidth.default - 20,
      y: 20,
    });

    // Manual panel positioned adjacent to controls
    expect(layout.manual.width).toBe(UI_CONFIG.panelWidth.manual);
    expect(layout.manual.initialPosition).toEqual({ x: 235, y: 20 });

    // Metrics modal
    expect(layout.metrics.width).toBe(UI_CONFIG.panelWidth.metrics);
    expect(layout.metrics.initialPosition).toEqual({ x: 240, y: 240 });
  });

  it("computes mobile layout coordinates correctly", () => {
    const layout = resolveHudLayout(500, true, false);

    expect(layout.isMobile).toBe(true);
    expect(layout.isTiny).toBe(false);

    expect(layout.controls.width).toBe(UI_CONFIG.panelWidth.mobile);
    expect(layout.brushes.width).toBe(UI_CONFIG.panelWidth.mobile);
    expect(layout.brushes.initialPosition.x).toBe(500 - UI_CONFIG.panelWidth.mobile - 20);

    expect(layout.manual.width).toBe("calc(100vw - 40px)");
    expect(layout.manual.initialPosition).toEqual({ x: 20, y: 20 });

    expect(layout.metrics.width).toBe(UI_CONFIG.panelWidth.metricsMobile);
    expect(layout.metrics.initialPosition).toEqual({ x: 20, y: 240 });
  });

  it("computes tiny screen layout coordinates correctly", () => {
    const layout = resolveHudLayout(360, true, true);

    expect(layout.isMobile).toBe(true);
    expect(layout.isTiny).toBe(true);

    expect(layout.controls.width).toBe(UI_CONFIG.panelWidth.tiny);
    expect(layout.brushes.width).toBe(UI_CONFIG.panelWidth.tiny);
    expect(layout.brushes.initialPosition.x).toBe(360 - UI_CONFIG.panelWidth.tiny - 20);
  });

  it("clamps brushes panel to minimum initial X bound on narrow viewports", () => {
    const layout = resolveHudLayout(100, true, true);

    // 100 - 160 - 20 = -80, clamped to minX = 20
    expect(layout.brushes.initialPosition.x).toBe(UI_CONFIG.initialPosition.x);
  });
});
