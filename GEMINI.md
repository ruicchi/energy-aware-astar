# Energy-Aware A* Project Context

## Project Overview
This project is a visual web-based simulation and dataset for an **Energy-Aware A*** path-planning algorithm. While traditional A* focuses solely on the shortest distance, this project introduces novel heuristics to optimize battery consumption for autonomous robots by factoring in terrain difficulty, elevation, and turning costs. The application visualizes a grid where users can place walls, a start node (robot), and a destination node, then watch the algorithm find and animate the optimal path.

## Tech Stack
*   **Framework:** React 19
*   **Language:** TypeScript
*   **Build Tool:** Vite
*   **UI Library:** Material UI (`@mui/material`, `@mui/icons-material`)
*   **Styling:** Emotion (via Material UI) and standard CSS

## Directory Structure
*   **`src/algorithms/`**: Contains implementations of different A* variants (e.g., `astarEnergyAware.ts`, `astarManhattan.ts`).
*   **`src/game/`**: The core visualization components, including the main `GameGrid` (`game.tsx`), `MemoizedCell.tsx`, and `FloatingMenu.tsx`.
*   **`src/hooks/`**: Custom React hooks for managing state and user interactions (e.g., `useGridMouseClicks.tsx` for wall placement, `useViewport.tsx` for responsive grid sizing).
*   **`src/charts/`**: Components for visualizing performance metrics and energy heatmaps.
*   **`src/data/`**: Scenarios and environments for testing different terrain types (flat, elevated, mixed, etc.).

## Building and Running
The project uses standard `npm` scripts defined in `package.json`:

*   **Install Dependencies:** `npm install`
*   **Start Development Server:** `npm run dev`
*   **Build for Production:** `npm run build`
*   **Preview Production Build:** `npm run preview`
*   **Run Linter:** `npm run lint`

## Development Conventions & Architecture
*   **State & Performance:** The grid visualization (`GameGrid`) calculates cell dimensions based on the viewport. To maintain performance during pathfinding animations, the app avoids React state updates for every node step. Instead, it uses direct DOM manipulation (`classList.add`, `classList.remove`) to apply CSS classes (`node-visited`, `node-open`, `node-shortest-path`) with `setTimeout` for staggered animation.
*   **Interactivity:** Mouse interactions (click and drag to place walls) are managed by custom hooks (`useGridMouseClicks`), separating the interaction logic from the visual rendering.
*   **Algorithm Implementations:** Algorithms in `src/algorithms` are expected to return an object containing `visitedNodesInOrder` (for animating the search process) and `shortestPath` (for animating the final route).
