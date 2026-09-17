import { UI_CONFIG } from "../config/simulationConfig";

/**
 * Geometric layout specifications for HUD floating overlay panels.
 */
export interface HudPanelLayout {
  isMobile: boolean;
  isTiny: boolean;
  controls: {
    width: number;
    initialPosition: { x: number; y: number };
  };
  brushes: {
    width: number;
    initialPosition: { x: number; y: number };
  };
  manual: {
    width: number | string;
    maxWidth: string;
    initialPosition: { x: number; y: number };
  };
  metrics: {
    width: number;
    maxWidth: string;
    initialPosition: { x: number; y: number };
    zIndex: number;
    elevation: number;
  };
}

/**
 * Pure layout resolver determining panel dimensions and non-colliding initial positions
 * based on viewport width and responsive breakpoint flags.
 */
export function resolveHudLayout(
  windowWidth: number,
  isMobile = windowWidth < 600,
  isTiny = windowWidth <= 400,
): HudPanelLayout {
  const controlWidth = isTiny
    ? UI_CONFIG.panelWidth.tiny
    : isMobile
      ? UI_CONFIG.panelWidth.mobile
      : UI_CONFIG.panelWidth.default;

  const brushesWidth = controlWidth;

  const brushesX = Math.max(
    UI_CONFIG.initialPosition.x,
    windowWidth - brushesWidth - UI_CONFIG.initialPosition.x,
  );

  return {
    isMobile,
    isTiny,
    controls: {
      width: controlWidth,
      initialPosition: {
        x: UI_CONFIG.initialPosition.x,
        y: UI_CONFIG.initialPosition.y,
      },
    },
    brushes: {
      width: brushesWidth,
      initialPosition: {
        x: brushesX,
        y: UI_CONFIG.initialPosition.y,
      },
    },
    manual: {
      width: isMobile ? "calc(100vw - 40px)" : UI_CONFIG.panelWidth.manual,
      maxWidth: "calc(100vw - 32px)",
      initialPosition: {
        x: isMobile ? UI_CONFIG.initialPosition.x : UI_CONFIG.initialPosition.x + 235,
        y: UI_CONFIG.initialPosition.y,
      },
    },
    metrics: {
      width: isMobile ? UI_CONFIG.panelWidth.metricsMobile : UI_CONFIG.panelWidth.metrics,
      maxWidth: "calc(100vw - 24px)",
      initialPosition: {
        x: isMobile ? UI_CONFIG.initialPosition.x : UI_CONFIG.initialPosition.x + 235,
        y: UI_CONFIG.initialPosition.y + 225,
      },
      zIndex: UI_CONFIG.zIndex.modal,
      elevation: UI_CONFIG.elevation.modal,
    },
  };
}
