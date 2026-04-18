//# Builds the grid cell
import Box from '@mui/material/Box'
import { useMemo, useRef, useState } from 'react'
import {
  useViewport,
  useGridMouseClicks,
  MemoizedCell,
  FloatingMenu,
  runAStarManhattan,
  runAStarEnergyAware,
} from '../index'
import { type Heading } from '../algorithms/astar/astarEnergyAware'

const GameGrid = () => {
  const viewport = useViewport()

  //* Dynamic cell size for mobile
  const cellSize = viewport.width < 600 ? 20 : 28

  const [elevationBrushValue, setElevationBrushValue] = useState<number>(5)
  const [pathMetrics, setPathMetrics] = useState<{ distance: number; energy: number } | null>(null)
  const [robotHeading, setRobotHeading] = useState<Heading>('RIGHT')
  const [currentPath, setCurrentPath] = useState<string[] | null>(null)
  const [walkingStep, setWalkingStep] = useState<number>(-1)
  const [isWalking, setIsWalking] = useState<boolean>(false)
  const [hasFinishedWalking, setHasFinishedWalking] = useState<boolean>(false)

  const [isManhattanFinished, setIsManhattanFinished] = useState<boolean>(false)
  const [isEnergyFinished, setIsEnergyFinished] = useState<boolean>(false)
  const [showManhattanSearch, setShowManhattanSearch] = useState<boolean>(true)
  const [showEnergySearch, setShowEnergySearch] = useState<boolean>(true)

  //* Grid dimensions
  const cols = Math.floor(viewport.width / cellSize)
  const rows = Math.floor(viewport.height / cellSize)

  //* Set default coordinates
  const defaultRobotCol = Math.floor(cols / 4)
  const defaultDestCol = Math.floor((cols / 4) * 3)
  const defaultRow = Math.floor(rows / 2)

  const currentRunId = useRef<number>(0)

  //Note: we calculate defaults, and pass them into the hook
  const {
    wallNode,
    terrainFactors,
    elevations,
    robotNode,
    destinationNode,
    activeBrush,
    setActiveBrush,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    clearWalls,
  } = useGridMouseClicks(
    `${defaultRow}-${defaultRobotCol}`,
    `${defaultRow}-${defaultDestCol}`,
    elevationBrushValue
  )

  //* Keep track of timeouts so we can cancel them if needed
  const animationTimeouts = useRef<number[]>([])

  const clearAnimations = () => {
    animationTimeouts.current.forEach(clearTimeout)
    animationTimeouts.current = []

    setIsManhattanFinished(false)
    setIsEnergyFinished(false)
    setShowManhattanSearch(true)
    setShowEnergySearch(true)
    setCurrentPath(null)
    setWalkingStep(-1)
    setIsWalking(false)
    setHasFinishedWalking(false)

    document
      .querySelectorAll('.node-visited, .node-open, .node-shortest-path, .node-energy-visited, .node-energy-open, .node-energy-shortest-path')
      .forEach((el) => {
        el.classList.remove(
          'node-visited', 'node-open', 'node-shortest-path',
          'node-energy-visited', 'node-energy-open', 'node-energy-shortest-path'
        )
      })
  }

  type VisitedNode = { key: string; type: 'open' | 'closed' }

  const animateResult = (
    visitedNodesInOrder: VisitedNode[],
    shortestPath: string[],
    visitedClass: string = 'node-visited',
    openClass: string = 'node-open',
    pathClass: string = 'node-shortest-path'
  ): number => {
    // 3. Animate Visited/Open Nodes
    for (let i = 0; i < visitedNodesInOrder.length; i++) {
      const timeout = setTimeout(() => {
        const { key, type } = visitedNodesInOrder[i]
        const node = document.getElementById(`cell-${key}`)
        if (node) {
          if (type === 'closed') {
            node.classList.remove(openClass)
            node.classList.add(visitedClass)
          } else if (type === 'open') {
            node.classList.add(openClass)
          }
        }
      }, 10 * i) // 10ms per node
      animationTimeouts.current.push(timeout as unknown as number)
    }

    // 4. Animate Shortest Path after visited nodes finish
    const pathDelay = visitedNodesInOrder.length * 10
    for (let i = 0; i < shortestPath.length; i++) {
      // Don't overwrite the start and destination node colors
      if (shortestPath[i] === robotNode || shortestPath[i] === destinationNode)
        continue

      const timeout = setTimeout(
        () => {
          const node = document.getElementById(`cell-${shortestPath[i]}`)
          if (node) {
            node.classList.remove(visitedClass)
            node.classList.remove(openClass)
            node.classList.add(pathClass)
          }
        },
        pathDelay + 30 * i,
      ) // 30ms per path node
      animationTimeouts.current.push(timeout as unknown as number)
    }

    return pathDelay + (shortestPath.length * 30)
  }

  const visualizeAStar = () => {
    clearAnimations()
    setRobotHeading('RIGHT')

    const scenario = {
      rows,
      cols,
      robotNode,
      destinationNode,
      wallNodes: wallNode,
      terrainFactors: terrainFactors,
      elevations: elevations,
      climbingFactor: 1.5,
      turnPenalty: 2.0,
    }

    const { visitedNodesInOrder, shortestPath, totalEnergy, totalDistance } = runAStarManhattan(scenario)
    setPathMetrics({ distance: totalDistance, energy: totalEnergy })
    setCurrentPath(shortestPath)
    const duration = animateResult(visitedNodesInOrder, shortestPath, 'node-visited', 'node-open', 'node-shortest-path')
    const t = setTimeout(() => setIsManhattanFinished(true), duration)
    animationTimeouts.current.push(t as unknown as number)
  }

  const visualizeEnergyAwareAStar = () => {
    clearAnimations()
    setRobotHeading('RIGHT')

    const scenario = {
      rows,
      cols,
      robotNode,
      destinationNode,
      wallNodes: wallNode,
      terrainFactors: terrainFactors,
      elevations: elevations,
      climbingFactor: 1.5,
      turnPenalty: 2.0,
    }

    const { visitedNodesInOrder, shortestPath, totalEnergy, totalDistance } = runAStarEnergyAware(scenario)
    setPathMetrics({ distance: totalDistance, energy: totalEnergy })
    setCurrentPath(shortestPath)
    const duration = animateResult(visitedNodesInOrder, shortestPath, 'node-energy-visited', 'node-energy-open', 'node-energy-shortest-path')
    const t = setTimeout(() => setIsEnergyFinished(true), duration)
    animationTimeouts.current.push(t as unknown as number)
  }

  const getHeadingFromNodes = (from: string, to: string): Heading => {
    const [r1, c1] = from.split('-').map(Number)
    const [r2, c2] = to.split('-').map(Number)
    const dr = r2 - r1
    const dc = c2 - c1

    if (dr === -1 && dc === 0) return 'UP'
    if (dr === 1 && dc === 0) return 'DOWN'
    if (dr === 0 && dc === -1) return 'LEFT'
    if (dr === 0 && dc === 1) return 'RIGHT'
    if (dr === -1 && dc === -1) return 'UP_LEFT'
    if (dr === -1 && dc === 1) return 'UP_RIGHT'
    if (dr === 1 && dc === -1) return 'DOWN_LEFT'
    if (dr === 1 && dc === 1) return 'DOWN_RIGHT'
    return 'NONE'
  }

  const handleWalkPath = () => {
    if (!currentPath || currentPath.length === 0 || isWalking) return

    setIsWalking(true)
    setHasFinishedWalking(false)
    setWalkingStep(0)

    for (let i = 0; i < currentPath.length; i++) {
      const timeout = setTimeout(() => {
        if (i > 0) {
          const prevNode = currentPath[i - 1]
          const nextNode = currentPath[i]
          const heading = getHeadingFromNodes(prevNode, nextNode)
          if (heading !== 'NONE') setRobotHeading(heading)
        }

        setWalkingStep(i)

        if (i === currentPath.length - 1) {
          setIsWalking(false)
          setHasFinishedWalking(true)
        }
      }, i * 200)
      animationTimeouts.current.push(timeout as unknown as number)
    }
  }

  const handleReset = () => {
    // 1. Increment run ID to instantly kill any currently running async animations
    currentRunId.current += 1
    clearAnimations()
    clearWalls()
    setPathMetrics(null)
  }

  //* For caching grid from user inputs
  const cells = useMemo(() => {
    return Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      return { row, col, key: `${row}-${col}` }
    })
  }, [rows, cols])

  return (
    //* Builds the container
    <Box
      className={`
        ${!showManhattanSearch ? 'hide-manhattan-search' : ''}
        ${!showEnergySearch ? 'hide-energy-search' : ''}
      `}
      sx={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        userSelect: 'none',
        position: 'relative',
        touchAction: 'none',
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* //* ADD FLOATING MENU */}
      <FloatingMenu
        onClearWalls={clearWalls}
        onVisualizeAStar={visualizeAStar}
        onVisualizeEnergyAwareAStar={visualizeEnergyAwareAStar}
        onReset={handleReset}
        activeBrush={activeBrush}
        onSelectBrush={setActiveBrush}
        elevationValue={elevationBrushValue}
        onElevationChange={setElevationBrushValue}
        pathMetrics={pathMetrics}
        isManhattanFinished={isManhattanFinished}
        isEnergyFinished={isEnergyFinished}
        showManhattanSearch={showManhattanSearch}
        showEnergySearch={showEnergySearch}
        onToggleManhattanSearch={() => setShowManhattanSearch(!showManhattanSearch)}
        onToggleEnergySearch={() => setShowEnergySearch(!showEnergySearch)}
        onWalkPath={handleWalkPath}
        hasPath={!!currentPath}
        isWalking={isWalking}
      />

      {/* //* Render each cell into clickable Box cells */}
      <Box
        sx={{
          width: cols * cellSize,
          height: rows * cellSize,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          backgroundColor: '#f2f2f2',
          position: 'relative',
        }}
      >
        {/* Walking Robot Overlay */}
        {(isWalking || hasFinishedWalking) && currentPath && walkingStep !== -1 && (
          <Box
            sx={{
              position: 'absolute',
              width: cellSize,
              height: cellSize,
              zIndex: 10,
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#4caf50',
              left: Number(currentPath[walkingStep].split('-')[1]) * cellSize,
              top: Number(currentPath[walkingStep].split('-')[0]) * cellSize,
              transition: isWalking ? 'all 0.2s linear' : 'none',
            }}
          >
            <MemoizedCell
              cellKey="walking-robot"
              cellSize={cellSize}
              row={0}
              col={0}
              isWall={false}
              isRobot={true}
              isDestination={false}
              terrainFactor={0}
              elevation={0}
              heading={robotHeading}
              onMouseDown={() => {}}
              onMouseEnter={() => {}}
            />
          </Box>
        )}

        {cells.map((cell) => {
          return (
            <MemoizedCell
              key={cell.key}
              cellKey={cell.key}
              cellSize={cellSize}
              row={cell.row}
              col={cell.col}
              isWall={wallNode.has(cell.key)}
              isRobot={cell.key === robotNode && !isWalking && !hasFinishedWalking}
              isDestination={cell.key === destinationNode}
              terrainFactor={terrainFactors.get(cell.key) || 0}
              elevation={elevations.get(cell.key) || 0}
              heading={cell.key === robotNode ? robotHeading : undefined}
              onMouseDown={handleMouseDown}
              onMouseEnter={handleMouseEnter}
            />
          )
        })}
      </Box>
    </Box>
  )
}

export default GameGrid
