import { createContext, useContext } from "react";

/**
 * Interface defining the HUD communication seam for overlay dialogs and panel states.
 */
export interface HudContextValue {
  isMetricsOpen: boolean;
  openMetrics: () => void;
  closeMetrics: () => void;
}

export const HudContext = createContext<HudContextValue | null>(null);

/**
 * Hook providing access to HUD modal lifecycle controls without prop drilling.
 * Provides safe fallback no-op functions when rendered outside a HudContext.Provider.
 */
export function useHud(): HudContextValue {
  const ctx = useContext(HudContext);
  if (!ctx) {
    return {
      isMetricsOpen: false,
      openMetrics: () => {},
      closeMetrics: () => {},
    };
  }
  return ctx;
}
