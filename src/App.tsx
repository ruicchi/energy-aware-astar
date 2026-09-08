import GameGrid from "./game/GameGrid"
import { SimulationProvider } from "./game/SimulationProvider"
import "./App.css"

function App() {
  return (
    <div className="App">
      <SimulationProvider>
        <GameGrid />
      </SimulationProvider>
    </div>
  )
}

export default App

