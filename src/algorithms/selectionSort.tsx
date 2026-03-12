//# selection sort algorithm

function generateSelectionSortSteps(inputArray: number[]): Step[] {
  const array = [...inputArray];
  const steps = [];
  const sortedIndices: number[] = [];

  // Push initial state
  steps.push({
    array: [...array],
    sortedIndices: [...sortedIndices],
  });

  for (let i = 0; i < array.length - 1; i++) {
    let minIndex = i;
    // Step: show current index being considered
    steps.push({
      array: [...array],
      comparingIndices: [i, minIndex],
      sortedIndices: [...sortedIndices],
    });
    for (let j = i + 1; j < array.length; j++) {
      // Step: show comparison
      steps.push({
        array: [...array],
        comparingIndices: [minIndex, j],
        sortedIndices: [...sortedIndices],
      });
      if (array[j] < array[minIndex]) {
        minIndex = j;
        // Step: show new min selection
        steps.push({
          array: [...array],
          comparingIndices: [i, minIndex],
          sortedIndices: [...sortedIndices],
        });
      }
    }
    if (minIndex !== i) {
      // Swap
      [array[i], array[minIndex]] = [array[minIndex], array[i]];
      steps.push({
        array: [...array],
        swappingIndices: [i, minIndex],
        sortedIndices: [...sortedIndices],
      });
    }
    sortedIndices.push(i);
    // Step: show sorted element
    steps.push({
      array: [...array],
      sortedIndices: [...sortedIndices],
    });
  }
  // Mark last element as sorted
  sortedIndices.push(array.length - 1);
  steps.push({
    array: [...array],
    sortedIndices: [...sortedIndices],
  });

  return steps;
}

export default generateSelectionSortSteps;
