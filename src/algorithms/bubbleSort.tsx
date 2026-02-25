//# bubble sort algorithm
//study

function generateBubbleSortSteps(inputArray: number[]): Step[] {
  //* Clones the input array to avoid mutating the original
  const array = [...inputArray];

  //* an array to store all steps
  const steps = [];

  //* tracker for which indices are sorted.
  const sortedIndices = [];

  //* Step: pushes initial state
  steps.push({
    array: [...array],
    sortedIndices: [...sortedIndices]
  });

  //# Outer loop: controls the number of passes through the array
  for (let i = 0; i < array.length - 1; i++) {
    
    //# Inner loop: compares adjacent elements
    //* After each pass, the largest element "bubbles up" to the end, so we can reduce the inner loop range by i each time
    for (let j = 0; j < array.length - i - 1; j++) {
      
      //* Step: comparison and pushes to step
      steps.push({
        array: [...array],
        comparingIndices: [j, j + 1],
        sortedIndices: [...sortedIndices]
      });
      
      //* Compare adjacent elements
      if (array[j] > array[j + 1]) {
        //* Swap if they're in the wrong order
        const temp = array[j];
        array[j] = array[j + 1];
        array[j + 1] = temp;

        //* Step: Show swap
        steps.push({
          array: [...array],
          swappingIndices: [j, j + 1],
          sortedIndices: [...sortedIndices]
        });
      }
    }

    //* Mark last position as sorted
    sortedIndices.push(array.length - 1 - i);

    //* Step: Show newly sorted element
    steps.push({
      array: [...array],
      sortedIndices: [...sortedIndices]
    });
  }

  return steps;
}

export default generateBubbleSortSteps;