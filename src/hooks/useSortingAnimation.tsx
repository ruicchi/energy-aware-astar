//# sorting animation hook | buttons, 

import { useState, useEffect } from 'react';
import generateBubbleSortSteps from '../algorithms/bubbleSort';
import generateMergeSortSteps from '../algorithms/mergeSort';

//* hook for animations
export const useSortingAnimation = (
  arraySize, 
  setArraySize,
  generateNewArray, 
  setArray, 
  selectedAlgorithm, 
  array) => {

  //* initializes steps, index, and playing state
  const [steps, setSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  //* State for progress speed, using percentage for easier understanding
  const [progressSpeed, setProgressSpeed] = useState<number[]>(50);
  
  //* Animation states
  const [comparingIndices, setComparingIndices] = useState<number[]>([]); //^ which bars to highlight?
  const [sortedIndices, setSortedIndices] = useState<number[]>([]); //^ which bars are in final position
  const [swappingIndices, setSwappingIndices] = useState<number[]>([]); //^ which bars are swapping?
  const [activeIndices, setActiveIndices] = useState<number[]>([]); //^ which bars are active?
  
  //* listener
  useEffect(() => {
      //* only runs if playing and not at end
      if (isPlaying && currentStepIndex < steps.length - 1) {
        
        //* Calculate delay based on speed slider
        //* progressSpeed is 1-100, convert to milliseconds
        const delay = 1000 - (progressSpeed * 9); //* Fast = low delay | can be set to another value
        
        //* Set timer to advance to next step
        const timer = setTimeout(() => {
          setCurrentStepIndex(prev => prev + 1);
        }, delay);
        
        //* Cleanup: cancel timer if something changes
        return () => clearTimeout(timer);
        
      } else if (currentStepIndex >= steps.length - 1) {
        //* Reached the end, stop playing
        setIsPlaying(false);
      }
    }, [isPlaying, currentStepIndex, steps.length, progressSpeed]);

  //*handler for play
  const play = () => {
    setIsPlaying(true);
  };

  //*handler for pause
  const pause = () => {
    setIsPlaying(false);
  };

  //*handler for reset
  const reset = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setComparingIndices([]);
    setSortedIndices([]);
  };

  //*handler for randomize
  const randomize = () => {
    const newArray = generateNewArray(arraySize);
    setArray(newArray);
    setIsPlaying(false);
    setComparingIndices([]);
    setSortedIndices([]);
    
    //* Regenerate steps if an algorithm was selected
    if (selectedAlgorithm === 'bubble' || selectedAlgorithm === 'merge') {
      regenerateSteps(newArray);
    }
  };

  //* listener for array sizes
  useEffect(() => {
    randomize();
  }, [arraySize]);

  //study handler for seek left (go to previous step)
  const seekLeft = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setIsPlaying(false); //^ Pause when seeking
    }
  };

  //study handler for seek right (go to next step)
  const seekRight = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setIsPlaying(false); //^ Pause when seeking
    }
  };

  //* Handlers for sliders
  const handleSpeedChange = (event) => {
    setProgressSpeed(event.target.value);
  };

  const handleArraySize = (event) => {
    setArraySize(event.target.value);
  };

  //study progress slider for steps
  const handleProgressChange = (event) => {
    const newStepIndex = parseInt(event.target.value);
    setCurrentStepIndex(newStepIndex);
    setIsPlaying(false); //* Pause when manually scrubbing
  };

   const regenerateSteps = (currentArray: number[]) => {
    if (selectedAlgorithm == 'bubble') {
      const sortingSteps = generateBubbleSortSteps(currentArray);
      setSteps(sortingSteps);
      setCurrentStepIndex(0);
      console.log("Regenerated bubble sort steps:", sortingSteps.length);
    } else if (selectedAlgorithm == 'merge') {
      const sortingSteps = generateMergeSortSteps(currentArray);
      setSteps(sortingSteps);
      setCurrentStepIndex(0);
      console.log("Regenerated merge sort steps:", sortingSteps.length);
    }
  };

  //* gets the current step data
  const currentStep = steps[currentStepIndex] || null;

  //* Update display states when the step changes
  useEffect(() => {
    if (currentStep) {
      setArray(currentStep.array);
      setComparingIndices(currentStep.comparingIndices || []);
      setSwappingIndices(currentStep.swappingIndices || []);
      setSortedIndices(currentStep.sortedIndices || []);
      setActiveIndices(currentStep.activeIndices || []);
    }
  }, [currentStepIndex]);

  //study array mapper to have bars on numbers with index
  const arrayBars = array.map((value, index) => {
      
      let barColor = '#00a4db';  //* Default blue
  
      if (sortedIndices.includes(index)) {
        barColor = '#10b981';  //* Green for sorted
      } else if (comparingIndices.includes(index)) {
        barColor = '#f59e0b';  //* Orang for comparing
      } else if (swappingIndices && swappingIndices.includes(index)) {
        barColor = '#ef4444';  //* Red for swapping
      } else if (activeIndices && activeIndices.includes(index)) {
        barColor = '#8b5cf6';  //* Purple for active subarray
      }

      return (
        <div
          key={index}
          className='arrayBar'
          style={{ 
            height: `${value * 3}px`,
            backgroundColor: barColor,
            transition: 'all 0.3s ease'
          }} 
        >
          <span className='barValue'>{value}</span> 
          <span className="indexLabel">{index}</span> 
        </div>
      );
  });

  return {
    steps,
    setSteps,
    currentStepIndex,
    setCurrentStepIndex,
    isPlaying,
    setIsPlaying,
    progressSpeed,
    setProgressSpeed,
    comparingIndices,
    setComparingIndices,
    play,
    pause,
    reset,
    seekLeft,
    seekRight,
    handleSpeedChange,
    handleArraySize,
    handleProgressChange,
    randomize,
    currentStep,
    arrayBars
  };
};