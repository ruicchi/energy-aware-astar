//# merge sort algorithm
//! to be finalized, merge sort should store unchosen elements of array | update visualizer also
//study

function generateMergeSortSteps(inputArray: number[]): Step[] {
  const steps = [];
  const array = [...inputArray];
  
  //* Store initial state
  steps.push({
    array: [...array],
    comparingIndices: [],
    swappingIndices: [],
    sortedIndices: [],
    activeIndices: []
  });

  mergeSortHelper(array, 0, array.length - 1, steps);
  
  //* Final state - everything sorted
  steps.push({
    array: [...array],
    comparingIndices: [],
    swappingIndices: [],
    sortedIndices: Array.from({ length: array.length }, (_, i) => i),
    activeIndices: []
  });
  
  return steps;
}

function mergeSortHelper(array: number[], left: number, right: number, steps: Step[]): void {
  if (left >= right) {
    return;
  }

  const middle = Math.floor((left + right) / 2);
  
  //* Divide phase - show the subarray being split
  const divideIndices = [];
  for (let i = left; i <= right; i++) {
    divideIndices.push(i);
  }
  steps.push({
    array: [...array],
    comparingIndices: [],
    swappingIndices: [],
    sortedIndices: [],
    activeIndices: divideIndices
  });
  
  //* Recursively sort left and right halves
  mergeSortHelper(array, left, middle, steps);
  mergeSortHelper(array, middle + 1, right, steps);
  
  //* Merge the sorted halves
  merge(array, left, middle, right, steps);
}

function merge(array: number[], left: number, middle: number, right: number, steps: Step[]): void {
  //* Create auxiliary arrays
  const leftArray = [];
  for (let i = left; i <= middle; i++) {
    leftArray.push(array[i]);
  }
  
  const rightArray = [];
  for (let i = middle + 1; i <= right; i++) {
    rightArray.push(array[i]);
  }
  
  let i = 0;  //* Index for leftArray
  let j = 0;  //* Index for rightArray
  let k = left;  //* Index for merged array
  
  const activeIndices = [];
  for (let idx = left; idx <= right; idx++) {
    activeIndices.push(idx);
  }

  //* Merge process
  while (i < leftArray.length && j < rightArray.length) {
    //* Show which elements are being compared
    steps.push({
      array: [...array],
      comparingIndices: [left + i, middle + 1 + j],
      swappingIndices: [],
      sortedIndices: [],
      activeIndices: activeIndices
    });
    
    //* Choose the smaller element
    if (leftArray[i] <= rightArray[j]) {
      array[k] = leftArray[i];
      i++;
    } else {
      array[k] = rightArray[j];
      j++;
    }
    
    //* Show the element placed in position
    steps.push({
      array: [...array],
      comparingIndices: [],
      swappingIndices: [k],
      sortedIndices: [],
      activeIndices: activeIndices
    });
    
    k++;
  }
  
  //* Copy remaining elements from left array
  while (i < leftArray.length) {
    array[k] = leftArray[i];
    steps.push({
      array: [...array],
      comparingIndices: [],
      swappingIndices: [k],
      sortedIndices: [],
      activeIndices: activeIndices
    });
    i++;
    k++;
  }
  
  //* Copy remaining elements from right array
  while (j < rightArray.length) {
    array[k] = rightArray[j];
    steps.push({
      array: [...array],
      comparingIndices: [],
      swappingIndices: [k],
      sortedIndices: [],
      activeIndices: activeIndices
    });
    j++;
    k++;
  }
}

export default generateMergeSortSteps;