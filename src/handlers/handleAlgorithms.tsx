//# handlers for algorithms for when an algorithm button is clicked

import generateBubbleSortSteps from '../algorithms/bubbleSort';
import generateMergeSortSteps from '../algorithms/mergeSort';
import generateQuickSortSteps from '../algorithms/quickSort';
import generateSelectionSortSteps from '../algorithms/selectionSort';
import generateHeapSortSteps from '../algorithms/heapSort';
import generateInsertionSortSteps from '../algorithms/insertionSort';
import generateRadixSortSteps from '../algorithms/radixSort';

//* when you click a sorting button
export const handleSortTypeClick = (
  selectedAlgorithm,
  array,
  setSelectedAlgorithm,
  setSteps,
  setCurrentStepIndex,
  setIsPlaying,
) => {
  switch (selectedAlgorithm) {
    case 'bubble':
      handleBubbleSort(
        array,
        setSelectedAlgorithm,
        setSteps,
        setCurrentStepIndex,
        setIsPlaying,
      );
      break;
    case 'merge':
      handleMergeSort(
        array,
        setSelectedAlgorithm,
        setSteps,
        setCurrentStepIndex,
        setIsPlaying,
      );
      break;
    case 'quick':
      handleQuickSort(
        array,
        setSelectedAlgorithm,
        setSteps,
        setCurrentStepIndex,
        setIsPlaying,
      );
      break;
    case 'selection':
      handleSelectionSort(
        array,
        setSelectedAlgorithm,
        setSteps,
        setCurrentStepIndex,
        setIsPlaying,
      );
      break;
    case 'heap':
      handleHeapSort(
        array,
        setSelectedAlgorithm,
        setSteps,
        setCurrentStepIndex,
        setIsPlaying,
      );
      break;
    case 'insertion':
      handleInsertionSort(
        array,
        setSelectedAlgorithm,
        setSteps,
        setCurrentStepIndex,
        setIsPlaying,
      );
      break;
    case 'radix':
      handleRadixSort(
        array,
        setSelectedAlgorithm,
        setSteps,
        setCurrentStepIndex,
        setIsPlaying,
      );
      break;
  }
};

//* handler for bubble sort
const handleBubbleSort = (
  array,
  setSelectedAlgorithm,
  setSteps,
  setCurrentStepIndex,
  setIsPlaying,
) => {
  const sortingSteps = generateBubbleSortSteps(array); //^ Generate all steps
  setSelectedAlgorithm('bubble'); //^ sets selected algorithm

  setSteps(sortingSteps); //^ Store steps in state

  //* resets to beginning
  setCurrentStepIndex(0);
  setIsPlaying(false);

  console.log('Generated steps:', sortingSteps.length);
};

//* handler for merge sort
const handleMergeSort = (
  array,
  setSelectedAlgorithm,
  setSteps,
  setCurrentStepIndex,
  setIsPlaying,
) => {
  const sortingSteps = generateMergeSortSteps(array); //^ Generate all steps
  setSelectedAlgorithm('merge'); //^ sets selected algorithm

  setSteps(sortingSteps); //^ Store steps in state

  //* resets to beginning
  setCurrentStepIndex(0);
  setIsPlaying(false);

  console.log('Generated steps:', sortingSteps.length);
};

//* handler for quick sort
const handleQuickSort = (
  array,
  setSelectedAlgorithm,
  setSteps,
  setCurrentStepIndex,
  setIsPlaying,
) => {
  const sortingSteps = generateQuickSortSteps(array); //^ Generate all steps
  setSelectedAlgorithm('quick'); //^ sets selected algorithm

  setSteps(sortingSteps); //^ Store steps in state

  //* resets to beginning
  setCurrentStepIndex(0);
  setIsPlaying(false);

  console.log('Generated steps:', sortingSteps.length);
};

//* handler for selection sort
const handleSelectionSort = (
  array,
  setSelectedAlgorithm,
  setSteps,
  setCurrentStepIndex,
  setIsPlaying,
) => {
  const sortingSteps = generateSelectionSortSteps(array); //^ Generate all steps
  setSelectedAlgorithm('selection'); //^ sets selected algorithm

  setSteps(sortingSteps); //^ Store steps in state

  //* resets to beginning
  setCurrentStepIndex(0);
  setIsPlaying(false);

  console.log('Generated steps:', sortingSteps.length);
};

//* handler for selection sort
const handleHeapSort = (
  array,
  setSelectedAlgorithm,
  setSteps,
  setCurrentStepIndex,
  setIsPlaying,
) => {
  const sortingSteps = generateHeapSortSteps(array); //^ Generate all steps
  setSelectedAlgorithm('heap'); //^ sets selected algorithm

  setSteps(sortingSteps); //^ Store steps in state

  //* resets to beginning
  setCurrentStepIndex(0);
  setIsPlaying(false);

  console.log('Generated steps:', sortingSteps.length);
};

//* handler for insertion sort
const handleInsertionSort = (
  array,
  setSelectedAlgorithm,
  setSteps,
  setCurrentStepIndex,
  setIsPlaying,
) => {
  const sortingSteps = generateInsertionSortSteps(array); //^ Generate all steps
  setSelectedAlgorithm('insertion'); //^ sets selected algorithm

  setSteps(sortingSteps); //^ Store steps in state

  //* resets to beginning
  setCurrentStepIndex(0);
  setIsPlaying(false);

  console.log('Generated steps:', sortingSteps.length);
};

//* handler for radix sort
const handleRadixSort = (
  array,
  setSelectedAlgorithm,
  setSteps,
  setCurrentStepIndex,
  setIsPlaying,
) => {
  const sortingSteps = generateRadixSortSteps(array); //^ Generate all steps
  setSelectedAlgorithm('radix'); //^ sets selected algorithm

  setSteps(sortingSteps); //^ Store steps in state

  //* resets to beginning
  setCurrentStepIndex(0);
  setIsPlaying(false);

  console.log('Generated steps:', sortingSteps.length);
};
