import GameGrid from "./game/GameGrid";
import { GridProvider } from "./features/grid/GridProvider";
import { PathfindingProvider } from "./features/pathfinding/PathfindingProvider";
import { RobotProvider } from "./features/physics/RobotProvider";
import "./App.css";

function App() {
  return (
    <div className="App">
      <GridProvider>
        <RobotProvider>
          <PathfindingProvider>
            <GameGrid />
          </PathfindingProvider>
        </RobotProvider>
      </GridProvider>
    </div>
  );
}

export default App;
