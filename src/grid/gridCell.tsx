import Box from '@mui/material/Box';

const CELL_SIZE = 28;

export default function FullBorderedGrid() {
  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        p: 0,
        m: 0,
        boxSizing: 'border-box',
        backgroundColor: '#f2f2f2',
        backgroundImage: `
          linear-gradient(to right, #b8b8b8 1px, transparent 1px),
          linear-gradient(to bottom, #b8b8b8 1px, transparent 1px)
        `,
        backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
      }}
    />
  );
}