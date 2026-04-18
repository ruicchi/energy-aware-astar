import { memo } from 'react'
import Box from '@mui/material/Box'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { type Heading } from '../algorithms/astar/astarEnergyAware'

//study
type MemoizedCellProps = {
  cellKey: string
  cellSize: number
  row: number
  col: number
  isWall: boolean
  isRobot: boolean
  isDestination: boolean
  terrainFactor: number
  elevation: number
  heading?: Heading
  onMouseDown: (key: string) => void
  onMouseEnter: (key: string) => void
}

const getRotation = (heading: Heading | undefined) => {
  switch (heading) {
    case 'UP': return '-90deg'
    case 'DOWN': return '90deg'
    case 'LEFT': return '180deg'
    case 'RIGHT': return '0deg'
    case 'UP_LEFT': return '-135deg'
    case 'UP_RIGHT': return '-45deg'
    case 'DOWN_LEFT': return '135deg'
    case 'DOWN_RIGHT': return '45deg'
    default: return '0deg'
  }
}

//* React.memo prevents this cell from re-rendering unless its props change
export const MemoizedCell = memo(
  ({
    cellKey,
    cellSize,
    row,
    col,
    isWall,
    isRobot,
    isDestination,
    terrainFactor,
    elevation,
    heading,
    onMouseDown,
    onMouseEnter,
  }: MemoizedCellProps) => {
    //* Determine backgroundColor based on cell state. Priority goes to robot/destination
    let bgColor = 'transparent'
    if (isRobot)
      bgColor = '#4caf50' //* Green for Robot
    else if (isDestination)
      bgColor = '#f44336' //* Red for Destination
    else if (isWall) 
      bgColor = '#1a88e2' //* Blue for walls/active cells
    else if (terrainFactor === 0.5) 
      bgColor = '#d2b48c' //* Dirt (Tan)
    else if (terrainFactor === 2.0) 
      bgColor = '#00ffff' //* Water (Cyan)
    else if (elevation > 0) {
      //* Visual feedback for elevation (darker green for higher)
      const brightness = Math.max(0, 255 - elevation * 20)
      bgColor = `rgb(0, ${brightness}, 0)`
    }

    return (
      <Box
        id={`cell-${cellKey}`}
        onMouseDown={() => onMouseDown(cellKey)}
        onMouseEnter={() => onMouseEnter(cellKey)}
        sx={{
          width: cellSize,
          height: cellSize,
          boxSizing: 'border-box',
          borderRight: '1px solid #b8b8b8',
          borderBottom: '1px solid #b8b8b8',
          borderTop: row === 0 ? '1px solid #b8b8b8' : 'none',
          borderLeft: col === 0 ? '1px solid #b8b8b8' : 'none',
          backgroundColor: bgColor,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '8px',
          color: 'white',
          position: 'relative',
        }}
      >
        {isRobot && (
          <ArrowForwardIcon 
            sx={{ 
              fontSize: cellSize * 0.8, 
              transform: `rotate(${getRotation(heading)})`,
              transition: 'transform 0.2s ease-in-out'
            }} 
          />
        )}
        {elevation > 0 && !isRobot && !isDestination && !isWall && terrainFactor === 0 && elevation}
      </Box>
    )
  },
  (prevProps, nextProps) => {
    //* This only re-renders if the cell state tracking changes
    return (
      prevProps.isWall === nextProps.isWall &&
      prevProps.isRobot === nextProps.isRobot &&
      prevProps.isDestination === nextProps.isDestination &&
      prevProps.terrainFactor === nextProps.terrainFactor &&
      prevProps.elevation === nextProps.elevation &&
      prevProps.cellSize === nextProps.cellSize &&
      prevProps.heading === nextProps.heading
    )
  },
)

