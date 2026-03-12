import React, { useState } from 'react';
import './SortingVisualizer.css';
import { useArrayGenerator, useSortingAnimation } from '../hooks';
import { handleSortTypeClick } from '../handlers/handleAlgorithms';

const SortingVisualizerLogic = () => {
  //# main

  //notes: all functions are arrow functions, 'cause i think it's more intuitive to use than normal ones.

  //* State to track which algorithm is selected
  const [selectedAlgorithm, setSelectedAlgorithm] =
    useState('Pick an algorithm!');
  //study array generator with desctructuring syntax, making them local variables
  const { array, setArray, arraySize, setArraySize, generateNewArray } =
    useArrayGenerator();

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
    handlePlayPause,
    reset,
    randomize,
    seekLeft,
    seekRight,
    handleSpeedChange,
    handleArraySize,
    handleProgressChange,
    currentStep, //study
    arrayBars,
  } = useSortingAnimation(
    arraySize,
    setArraySize,
    generateNewArray,
    setArray,
    selectedAlgorithm,
    array,
  );

  //* object for display names
  const algorithmNames = {
    bubble: 'Bubble Sort',
    merge: 'Merge Sort',
    quick: 'Quick Sort',
    selection: 'Selection Sort',
    heap: 'Heap Sort',
    insertion: 'Insertion Sort',
    radix: 'Radix Sort',
  };

  //* mapper for display names
  const displayName = algorithmNames[selectedAlgorithm] || selectedAlgorithm;

  return (
    <div className='SortingVisualizer'>
      {/* //# Visual UI is here*/}

      {/* //* calls the arrayBars function and gives classname*/}
      <div className='arrayContainer'>{arrayBars}</div>

      {/* //* algorithm selector */}
      <div className='sortingButtons'>
        <button
          className={`btn bubble`}
          onClick={() =>
            handleSortTypeClick(
              'bubble',
              array,
              setSelectedAlgorithm,
              setSteps,
              setCurrentStepIndex,
              setIsPlaying,
            )
          }
        >
          Bubble Sort
        </button>
        <button
          className={`btn merge`}
          onClick={() =>
            handleSortTypeClick(
              'merge',
              array,
              setSelectedAlgorithm,
              setSteps,
              setCurrentStepIndex,
              setIsPlaying,
            )
          }
        >
          Merge Sort
        </button>
        <button
          className={`btn quick`}
          onClick={() =>
            handleSortTypeClick(
              'quick',
              array,
              setSelectedAlgorithm,
              setSteps,
              setCurrentStepIndex,
              setIsPlaying,
            )
          }
        >
          Quick Sort
        </button>
        <button
          className={`btn selection`}
          onClick={() =>
            handleSortTypeClick(
              'selection',
              array,
              setSelectedAlgorithm,
              setSteps,
              setCurrentStepIndex,
              setIsPlaying,
            )
          }
        >
          Selection Sort
        </button>
        <button
          className={`btn heap`}
          onClick={() =>
            handleSortTypeClick(
              array,
              'heap',
              setSelectedAlgorithm,
              setSteps,
              setCurrentStepIndex,
              setIsPlaying,
            )
          }
        >
          Heap Sort
        </button>
        <button
          className={`btn insertion`}
          onClick={() =>
            handleSortTypeClick(
              'insertion',
              array,
              setSelectedAlgorithm,
              setSteps,
              setCurrentStepIndex,
              setIsPlaying,
            )
          }
        >
          Insertion Sort
        </button>
        <button
          className={`btn radix`}
          onClick={() =>
            handleSortTypeClick(
              'radix',
              array,
              setSelectedAlgorithm,
              setSteps,
              setCurrentStepIndex,
              setIsPlaying,
            )
          }
        >
          Radix Sort
        </button>
      </div>

      <h1>Sorting Visualizer</h1>
      <p>Algorithm: {displayName}</p>

      {/* //* color legends */}
      <div className='colorLegends'>
        <span style={{ color: '#00a4db', marginRight: 10 }}>■ Default</span>
        <span style={{ color: '#f59e0b', marginRight: 10 }}>■ Comparing</span>
        <span style={{ color: '#CD3A3A', marginRight: 10 }}>■ Swapping</span>
        <span style={{ color: '#8b5cf6', marginRight: 10 }}>
          ■ Active Subarray
        </span>
        <span style={{ color: '#0E9F6F' }}>■ Sorted</span>
      </div>

      {/* //* noopener noreferrer for security, target blank for new window */}
      <a
        href='https://github.com/ruicchi/sorting-visualizer'
        target='_blank'
        rel='noopener noreferrer'
        className='githubBtn'
      >
        <img
          src='https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
          alt='GitHub'
        />
      </a>

      {/* //* buttons */}
      <div className='controlButtons'>
        <button
          className='btn seekLeft'
          onClick={seekLeft}
          disabled={currentStepIndex === 0 || steps.length === 0}
        >
          ᐸ
        </button>
        <button className='btn random' onClick={randomize}>
          ↳↰
        </button>
        <button
          className={`btn playPause ${isPlaying ? 'pause' : 'play'}`}
          onClick={handlePlayPause}
          disabled={selectedAlgorithm === 'Pick an algorithm!'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button className='btn stop' onClick={reset}>
          ⟳
        </button>
        <button
          className='btn seekRight'
          onClick={seekRight}
          disabled={currentStepIndex >= steps.length - 1 || steps.length === 0}
        >
          ᐳ
        </button>
      </div>

      {/* //debug: Show array as text */}
      <p>Array: {JSON.stringify(array)}</p>

      {/* //study slider for progress through steps */}
      <div className='rangeSliders'>
        <div className='slider progress'>
          <label>
            Progress: {currentStepIndex + 1} of {steps.length}
          </label>
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
          <label>Speed: {progressSpeed}%</label>
          <input
            type='range'
            min='1'
            max='100'
            value={progressSpeed}
            onChange={handleSpeedChange}
          />
        </div>

        {/* //* slider for array size*/}
        <div className='slider arraySize'>
          <label>Size: {arraySize}</label>
          <input
            type='range'
            min='4'
            max='30'
            value={arraySize}
            onChange={handleArraySize}
          />
        </div>
      </div>
    </div>
  );
};

export default SortingVisualizerLogic;
