import GameGrid from "./game/GameGrid"
import { GridProvider } from "./features/grid/GridProvider"
import { RobotProvider } from "./features/physics/RobotProvider"
import "./App.css"

function App() {
  return (
    <div className="App">
      <GridProvider>
        <RobotProvider>
          <GameGrid />
        </RobotProvider>
      </GridProvider>
    </div>
  )
}

export default App

