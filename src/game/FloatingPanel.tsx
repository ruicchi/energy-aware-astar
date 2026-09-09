import { useState, useRef } from "react";
import type { ReactNode } from "react";
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Collapse,
  type SxProps,
  type Theme,
} from "@mui/material";
import { ExpandMore, ExpandLess, Close } from "@mui/icons-material";

export interface FloatingPanelProps {
  title: string;
  initialPosition?: { x: number; y: number };
  width?: number | string;
  maxWidth?: number | string;
  zIndex?: number;
  elevation?: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  onClose?: () => void;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * Deep, reusable draggable panel module.
 * Encapsulates:
 * - Pointer capture and boundary-clamped dragging physics
 * - Collapsible accordion header
 * - Close button invoking onClose callback
 * - Consistent semi-transparent card chrome
 */
export const FloatingPanel = ({
  title,
  initialPosition = { x: 20, y: 20 },
  width,
  maxWidth,
  zIndex = 1000,
  elevation = 4,
  collapsible = false,
  defaultExpanded = true,
  onClose,
  children,
  sx,
}: FloatingPanelProps) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".MuiSlider-root") || target.closest("input")) {
      return;
    }

    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const maxX = typeof window !== "undefined" ? window.innerWidth - 60 : 1000;
    const maxY = typeof window !== "undefined" ? window.innerHeight - 50 : 1000;

    const rawX = e.clientX - dragStart.current.x;
    const rawY = e.clientY - dragStart.current.y;

    setPosition({
      x: Math.max(10, Math.min(maxX, rawX)),
      y: Math.max(10, Math.min(maxY, rawY)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }
  };

  return (
    <Paper
      elevation={elevation}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      sx={{
        position: "absolute",
        top: position.y,
        left: position.x,
        zIndex,
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        borderRadius: 2,
        width,
        maxWidth,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        overflow: "hidden",
        ...sx,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 1.5,
          borderBottom: !collapsible || isExpanded ? "1px solid rgba(0, 0, 0, 0.1)" : "none",
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {collapsible && (
            <IconButton
              size="small"
              onClick={() => setIsExpanded(!isExpanded)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
          {onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Close fontSize="inherit" />
            </IconButton>
          )}
        </Box>
      </Box>

      {collapsible ? (
        <Collapse in={isExpanded}>
          {children}
        </Collapse>
      ) : (
        children
      )}
    </Paper>
  );
};
