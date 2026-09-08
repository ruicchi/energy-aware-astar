import { useState, useRef } from "react";
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Collapse,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";

export const FloatingManual = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Left-aligned default position alongside Controls on desktop
  const [position, setPosition] = useState(() => ({
    x: isMobile ? 20 : 235,
    y: 20,
  }));
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    //* Only start dragging if we didn't click a button inside the menu
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
      x: Math.max(10, Math.min(window.innerWidth - 100, e.clientX - dragStart.current.x)),
      y: Math.max(10, Math.min(window.innerHeight - 50, e.clientY - dragStart.current.y)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
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
        width: isMobile ? "calc(100vw - 40px)" : 580,
        maxWidth: "calc(100vw - 32px)",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* Header bar that always shows */}
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
          Manual
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
        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            maxHeight: "calc(100vh - 120px)",
            overflowY: "auto",
            lineHeight: 1.0,
            textAlign: "left",
          }}
        >
          <Typography variant="body1" sx={{ fontSize: "inherit", lineHeight: "inherit" }}>
            Click within the white grid and drag your mouse to draw obstacles.
          </Typography>
          <Typography variant="body1" sx={{ fontSize: "inherit", lineHeight: "inherit" }}>
            Drag the{" "}
            <Box component="span" sx={{ color: "#2e7d32", fontWeight: "bold" }}>
              green
            </Box>{" "}
            node to set the start position.
          </Typography>
          <Typography variant="body1" sx={{ fontSize: "inherit", lineHeight: "inherit" }}>
            Drag the{" "}
            <Box component="span" sx={{ color: "#d32f2f", fontWeight: "bold" }}>
              red
            </Box>{" "}
            node to set the end position.
          </Typography>
          <Typography variant="body1" sx={{ fontSize: "inherit", lineHeight: "inherit" }}>
            Choose an algorithm from the controls panel.
          </Typography>
          <Typography variant="body1" sx={{ fontSize: "inherit", lineHeight: "inherit" }}>
            Click Visualize to start the animation.
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
};
