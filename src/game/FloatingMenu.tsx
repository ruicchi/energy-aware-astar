import { useState, useRef } from 'react';
import { Paper, Typography, Button, Box, IconButton, Collapse, Slider, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';

import { type EnergyBreakdown, type Heading, type BrushMode } from '../types';

type FloatingMenuProps = {
  onClearWalls: () => void;
  onVisualizeAStar: () => void;
  onVisualizeEnergyAwareAStar: () => void;
  onReset: () => void;
  activeBrush: BrushMode;
  onSelectBrush: (brush: BrushMode) => void;
  elevationValue: number;
  onElevationChange: (val: number) => void;
  pathMetrics: {
    algorithm: string;
    distance: number;
    energy: number;
    energyBreakdown: EnergyBreakdown;
  } | null;
  isManhattanFinished: boolean;
  isEnergyFinished: boolean;
  showManhattanSearch: boolean;
  showEnergySearch: boolean;
  onToggleManhattanSearch: () => void;
  onToggleEnergySearch: () => void;
  onWalkPath: () => void;
  hasPath: boolean;
  isWalking: boolean;
  currentHeading: Heading;
  onHeadingChange: (heading: Heading) => void;
  isLocked: boolean;
};

export const FloatingMenu = ({
  onClearWalls,
  onVisualizeAStar,
  onVisualizeEnergyAwareAStar,
  onReset,
  activeBrush,
  onSelectBrush,
  elevationValue,
  onElevationChange,
  pathMetrics,
  isManhattanFinished,
  isEnergyFinished,
  showManhattanSearch,
  showEnergySearch,
  onToggleManhattanSearch,
  onToggleEnergySearch,
  onWalkPath,
  hasPath,
  isWalking,
  currentHeading,
  onHeadingChange,
  isLocked,
}: FloatingMenuProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTiny = useMediaQuery('(max-width:400px)');

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [resultsPosition, setResultsPosition] = useState({ x: isMobile ? 20 : 240, y: 20 });
  const [isResultsDragging, setIsResultsDragging] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  //* State for dropdown
  const [isExpanded, setIsExpanded] = useState(true);

  const dragStart = useRef({ x: 0, y: 0 });
  const resultsDragStart = useRef({ x: 0, y: 0 });

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

  const handleResultsPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    setIsResultsDragging(true);
    resultsDragStart.current = {
      x: e.clientX - resultsPosition.x,
      y: e.clientY - resultsPosition.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResultsPointerMove = (e: React.PointerEvent) => {
    if (!isResultsDragging) return;
    setResultsPosition({
      x: e.clientX - resultsDragStart.current.x,
      y: e.clientY - resultsDragStart.current.y,
    });
  };

  const handleResultsPointerUp = (e: React.PointerEvent) => {
    setIsResultsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const energyPerUnit = pathMetrics && pathMetrics.distance > 0
    ? pathMetrics.energy / pathMetrics.distance
    : 0;
  const energyBreakdown = pathMetrics?.energyBreakdown;

  return (
    <>
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
          width: isMobile ? (isTiny ? 160 : 180) : 200,
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
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 1,
            pointerEvents: isLocked ? 'none' : 'auto',
            opacity: isLocked ? 0.6 : 1,
            transition: 'opacity 0.2s'
          }}>
            <Button
              variant="contained"
              color="error"
              fullWidth
              onPointerDown={(e) => e.stopPropagation()} // don't drag when clicking button
              onClick={onClearWalls}
            >
              Clear Tiles
            </Button>
          </Box>

          <Button
            variant="contained"
            color="warning"
            fullWidth
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onReset}
          >
            Reset Grid
          </Button>

          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 1,
            pointerEvents: isLocked ? 'none' : 'auto',
            opacity: isLocked ? 0.6 : 1,
            transition: 'opacity 0.2s'
          }}>
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

            {/* Search Map Toggles */}
            {(isManhattanFinished || isEnergyFinished) && (
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {isManhattanFinished && (
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={onToggleManhattanSearch}
                  >
                    {showManhattanSearch ? 'Hide A* Manhattan Search' : 'Show A* Manhattan Search'}
                  </Button>
                )}
                {isEnergyFinished && (
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={onToggleEnergySearch}
                  >
                    {showEnergySearch ? 'Hide Energy Search Map' : 'Show Energy Search Map'}
                  </Button>
                )}

                {hasPath && (
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={onWalkPath}
                    sx={{ mt: 1 }}
                  >
                    {isWalking ? 'Walking...' : 'Walk Path'}
                  </Button>
                )}
              </Box>
            )}

            {/* Metrics Display */}
            {pathMetrics && (
              <Box sx={{ mt: 2, p: 1, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Results:
                  </Typography>
                  <Tooltip title="Pop out results">
                    <IconButton
                      size="small"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setIsResultsOpen(true)}
                    >
                      <OpenInNewIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="caption" display="block">
                  Algorithm: {pathMetrics.algorithm}
                </Typography>
                <Typography variant="caption" display="block">
                  Distance: {pathMetrics.distance.toFixed(2)} units
                </Typography>
                <Typography variant="caption" display="block">
                  Energy: {pathMetrics.energy.toFixed(2)} units
                </Typography>
              </Box>
            )}

            {/* Robot Heading Config */}
            <Box sx={{ mt: 1, borderTop: '1px solid rgba(0,0,0,0.1)', pt: 1 }}>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                Robot Initial Heading
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {(['NONE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'UP_LEFT', 'UP_RIGHT', 'DOWN_LEFT', 'DOWN_RIGHT'] as Heading[]).map((h) => (
                  <Button
                    key={h}
                    variant={currentHeading === h ? "contained" : "outlined"}
                    color="secondary"
                    size="small"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onHeadingChange(h)}
                  >
                    {h === 'NONE' ? 'No Heading' : h.replace('_', ' ')}
                  </Button>
                ))}
              </Box>
            </Box>

            <Box sx={{ mt: 1, borderTop: '1px solid rgba(0,0,0,0.1)', pt: 1 }}>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                Brushes
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: isTiny ? '1fr' : '1fr 1fr', gap: 1 }}>
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

              {/* Elevation Slider */}
              {activeBrush === 'elevation' && (
                <Box sx={{ px: 1, mt: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    Brush Height: {elevationValue}
                  </Typography>
                  <Slider
                    size="small"
                    value={elevationValue}
                    min={1}
                    max={10}
                    step={1}
                    marks
                    onChange={(_, value) => onElevationChange(value as number)}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Collapse>
      </Paper>

      {pathMetrics && isResultsOpen && (
        <Paper
          elevation={6}
          onPointerDown={handleResultsPointerDown}
          onPointerMove={handleResultsPointerMove}
          onPointerUp={handleResultsPointerUp}
          sx={{
            position: 'absolute',
            top: resultsPosition.y,
            left: resultsPosition.x,
            zIndex: 1100,
            width: isMobile ? 220 : 280,
            maxWidth: 'calc(100vw - 24px)',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            borderRadius: 2,
            overflow: 'hidden',
            cursor: isResultsDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          <Box
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(0,0,0,0.1)',
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              Result Calculation
            </Typography>
            <Tooltip title="Close">
              <IconButton
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setIsResultsOpen(false)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box>
              <Typography variant="caption" color="textSecondary" display="block">
                Algorithm
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {pathMetrics.algorithm}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="textSecondary" display="block">
                Distance
              </Typography>
              <Typography variant="body2">
                {pathMetrics.distance.toFixed(2)} units
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="textSecondary" display="block">
                Energy Consumed
              </Typography>
              <Typography variant="body2">
                {pathMetrics.energy.toFixed(2)} units
              </Typography>
            </Box>

            <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.1)', pt: 1 }}>
              <Typography variant="caption" color="textSecondary" display="block">
                Energy per Distance
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {energyPerUnit.toFixed(2)} energy / unit
              </Typography>
            </Box>

            {energyBreakdown && (
              <Box sx={{ borderTop: '1px solid rgba(0,0,0,0.1)', pt: 1 }}>
                <Typography variant="caption" color="textSecondary" display="block">
                  Energy Breakdown
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="caption">Straight movement</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.straightMovement.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="caption">Diagonal movement</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.diagonalMovement.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="caption">Movement total</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.baseMovement.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="caption">Dirt penalty</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.dirtPenalty.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="caption">Water penalty</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.waterPenalty.toFixed(2)}
                    </Typography>
                  </Box>
                  {energyBreakdown.otherTerrainPenalty !== 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="caption">Other terrain</Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {energyBreakdown.otherTerrainPenalty.toFixed(2)}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="caption">Elevation cost</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.elevationCost.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="caption">Turn cost</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.turnCost.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="caption">Breakdown total</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {energyBreakdown.total.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      )}
    </>
  );
};
