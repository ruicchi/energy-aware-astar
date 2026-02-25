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

      <h1>Sorting Visualizer</h1>
      <p>Algorithm: {selectedAlgorithm}</p>

        {/* //* buttons */}
        <button className='btn random' onClick={randomize}>randomize</button>
        <button className='btn play' onClick={play}>play</button>
        <button className='btn pause' onClick={pause}>pause</button>
        <button className='btn stop' onClick={reset}>reset</button>
        <button 
          className='btn seekLeft' 
          onClick={seekLeft}
          disabled={currentStepIndex === 0 || steps.length === 0}
        >seek left</button>
        <button 
          className='btn seekRight'
          onClick={seekRight}
          disabled={currentStepIndex >= steps.length - 1 || steps.length === 0}
        >seek right</button>

        {/* //debug: Show array as text */}
        <p>Array: {JSON.stringify(array)}</p>

        {/* //* algorithm selector | planning to add more*/}
        <button 
          className={`btn bubble`}
          onClick={() => handleSortTypeClick('bubble', array, setSelectedAlgorithm, setSteps, setCurrentStepIndex, setIsPlaying)}
        >
          bubble sort
        </button>
        <button 
          className={`btn merge`}
          onClick={() => handleSortTypeClick('merge', array, setSelectedAlgorithm, setSteps, setCurrentStepIndex, setIsPlaying)}
        >
          merge sort
        </button>
        
      {/* //study slider for progress through steps */}
      <div className='slider progress'>
        <label>Progress: {currentStepIndex + 1} of {steps.length}</label>
        <input
          type='range'
          min='0'
          max={Math.max(0, steps.length - 1)}
          value={currentStepIndex}
          onChange={handleProgressChange}
          disabled={steps.length === 0}
        />
      </div>

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

        {/* //* slider for array size*/}
        <div className='slider arraySize'>
          <label>Array size: {arraySize}</label>
          <input 
            type = 'range'
            min = '4'
            max = '30'
            value = {arraySize} 
            onChange={handleArraySize}
          />
        </div>
    </div>
  );
};

export default SortingVisualizerLogic;