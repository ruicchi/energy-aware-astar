import React, { useState } from "react";
import "./SortingVisualizer.css";
import { useArrayGenerator, useSortingAnimation } from '../hooks';
import { handleSortTypeClick } from "../handlers/handleAlgorithms";

const SortingVisualizerLogic = () => {
  //# main

  //notes: all functions are arrow functions, 'cause i think it's more intuitive to use than normal ones. 
 
  //* State to track which algorithm is selected
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('Pick an algorithm!');
  //study array generator with desctructuring syntax, making them local variables
  const {
    array,
    setArray,
    arraySize,
    setArraySize,
    generateNewArray
  } = useArrayGenerator();

  const {
    steps,
    setSteps,
    currentStepIndex,
    setCurrentStepIndex,
    isPlaying, //study
    setIsPlaying,
    progressSpeed,
    setProgressSpeed,
    comparingIndices, //study
    setComparingIndices, //study
    play,
    pause,
    reset,
    randomize,
    seekLeft,
    seekRight,
    handleSpeedChange,
    handleArraySize,
    handleProgressChange,
    currentStep, //study
    arrayBars,
  } = useSortingAnimation(arraySize, 
      setArraySize, 
      generateNewArray, setArray, 
      selectedAlgorithm, 
      array
    )

  return (
    <div className="SortingVisualizer">
      {/* //# Visual UI is here*/}

      {/* //* calls the arrayBars function and gives classname*/}
      <div className = 'arrayContainer'>
        {arrayBars}
      </div>

      <h1>A* Visualizer</h1>

      <p>Click on a cell to add a start, end, and barrier nodes </p>
      
      {/* //* must have input box*/}
      <p>Maze size: </p>

        {/* //* buttons */}
        <button className='btn start' onClick={randomize}>start</button>
        <button className='btn reload' onClick={play}>reload</button>

        {/* //* slider for progress speed, planning to have thresholds or marks*/}
        <div className='slider progressSpeed'>
          <label>Progress Speed: {progressSpeed}%</label>
          <input
            type = 'range' 
            min = '1'
            max = '100'
            value = {progressSpeed} 
            onChange={handleSpeedChange}
          />
        </div>
    </div>
  );
};

export default SortingVisualizerLogic;