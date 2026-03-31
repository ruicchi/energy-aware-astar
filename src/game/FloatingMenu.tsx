import { useState, useRef } from 'react';
import { Paper, Typography, Button, Box, IconButton, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import type { BrushMode } from '../hooks/useGridMouseClicks';

type FloatingMenuProps = {
  onClearWalls: () => void;
  onVisualizeAStar: () => void;
  onVisualizeEnergyAwareAStar: () => void;
  onReset: () => void;
  activeBrush: BrushMode;
  onSelectBrush: (brush: BrushMode) => void;
};

export const FloatingMenu = ({
  onClearWalls,
  onVisualizeAStar,
  onVisualizeEnergyAwareAStar,
  onReset,
  activeBrush,
  onSelectBrush,
}: FloatingMenuProps) => {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);

  //* State for dropdown
  const [isExpanded, setIsExpanded] = useState(true);

  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    //* Only start dragging if we didn't click a button inside the menu
    if ((e.target as HTMLElement).closest('button')) return;

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
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
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
        position: 'absolute',
        top: position.y,
        left: position.x,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.4)', 
        borderRadius: 2,
        width: 200,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        overflow: 'hidden', 
      }}
    >
      {/* Header bar that always shows */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 1.5,
          borderBottom: isExpanded ? '1px solid rgba(0, 0, 0, 0.1)' : 'none'
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          Controls
        </Typography>

        {/* Toggle Button */}
        <IconButton 
          size="small" 
          onClick={() => setIsExpanded(!isExpanded)}
          onPointerDown={(e) => e.stopPropagation()} // don't drag when clicking toggle
        >
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* The drop-down content */}
      <Collapse in={isExpanded}>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button 
            variant="contained" 
            color="error" 
            fullWidth
            onPointerDown={(e) => e.stopPropagation()} // don't drag when clicking button
            onClick={onClearWalls}
          >
            Clear Walls
          </Button>

          <Button 
            variant="contained" 
            color="warning" 
            fullWidth
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={onReset}
          >
            Reset Grid
          </Button>

          <Button 
            variant="contained" 
            color="success" 
            fullWidth
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onVisualizeAStar}
          >
            Run A* Manhattan
          </Button>

          <Button 
            variant="contained" 
            color="primary" 
            fullWidth
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onVisualizeEnergyAwareAStar}
            sx={{ mt: 1 }}
          >
            Run Energy-Aware A*
          </Button>

          <Box sx={{ mt: 1, borderTop: '1px solid rgba(0,0,0,0.1)', pt: 1 }}>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
              Brushes
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Button 
                variant={activeBrush === 'wall' ? "contained" : "outlined"} 
                color="info" 
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelectBrush('wall')}
              >
                Wall
              </Button>

              <Button 
                variant={activeBrush === 'dirt' ? "contained" : "outlined"} 
                color="warning" 
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelectBrush('dirt')}
              >
                Dirt
              </Button>

              <Button 
                variant={activeBrush === 'water' ? "contained" : "outlined"} 
                color="primary" 
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelectBrush('water')}
              >
                Water
              </Button>

              <Button 
                variant={activeBrush === 'elevation' ? "contained" : "outlined"} 
                color="success" 
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelectBrush('elevation')}
              >
                Elevation
              </Button>
            </Box>
          </Box>

        </Box>
      </Collapse>
    </Paper>
  );
};