import { memo } from 'react';
import Box from '@mui/material/Box';

//study
type MemoizedCellProps = {
  cellKey: string;
  cellSize: number;
  row: number;
  col: number;
  isActive: boolean;
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
  onMouseDown,
  onMouseEnter,
}: MemoizedCellProps) => {
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
        backgroundColor: isActive ? '#1a88e2' : 'transparent',
        cursor: 'pointer',
      }}
    />
  );
}, (prevProps, nextProps) => {
  //* This only re-renders if the cell size, position, or active state changes
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.cellSize === nextProps.cellSize
  );
});