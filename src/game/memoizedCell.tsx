import { memo } from 'react';
import Box from '@mui/material/Box';

//study
type MemoizedCellProps = {
  cellKey: string;
  cellSize: number;
  row: number;
  col: number;
  isActive: boolean;
  isRobot: boolean;
  isDestination: boolean;
  onMouseDown: (key: string) => void;
  onMouseEnter: (key: string) => void;
};

//* React.memo prevents this cell from re-rendering unless its props change
export const MemoizedCell = memo(({
  cellKey,
  cellSize,
  row,
  col,
  isActive,
  isRobot,
  isDestination,
  onMouseDown,
  onMouseEnter,
}: MemoizedCellProps) => {

  //* Determine backgroundColor based on cell state. Priority goes to robot/destination
  let bgColor = 'transparent';
  if (isRobot) bgColor = '#4caf50'; //* Green for Robot
  else if (isDestination) bgColor = '#f44336'; //* Red for Destination
  else if (isActive) bgColor = '#1a88e2'; //* Blue for walls/active cells

  return (
    <Box
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
      }}
    />
  );
}, (prevProps, nextProps) => {
  //* This only re-renders if the cell state tracking changes
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.isRobot === nextProps.isRobot &&
    prevProps.isDestination === nextProps.isDestination &&
    prevProps.cellSize === nextProps.cellSize
  );
});