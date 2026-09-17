import Box from "@mui/material/Box";
import { SimulationProvider } from "./game/SimulationProvider";
import { SimulationHud } from "./game/SimulationHud";
import { SimulationCanvas } from "./game/SimulationCanvas";
import "./App.css";

function App() {
  return (
    <div className="App">
      <SimulationProvider>
        <Box
          sx={{
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            userSelect: "none",
            position: "relative",
            touchAction: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SimulationHud />
          <SimulationCanvas />
        </Box>
      </SimulationProvider>
    </div>
  );
}

export default App;
