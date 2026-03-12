//# quick sort algorithm
//study

function generateQuickSortSteps(inputArray: number[]): Step[] {
  const array = [...inputArray];
  const steps = [];
  const sortedIndices: number[] = [];

  //* Push initial state
  steps.push({
    array: [...array],
    sortedIndices: [...sortedIndices],
  });

  function quickSort(left: number, right: number) {
    if (left >= right) {
      if (left === right && !sortedIndices.includes(left)) {
        sortedIndices.push(left);
        steps.push({
          array: [...array],
          sortedIndices: [...sortedIndices],
        });
      }
      return;
    }

    //* Partition
    const pivotIndex = partition(left, right);
    sortedIndices.push(pivotIndex);
    steps.push({
      array: [...array],
      sortedIndices: [...sortedIndices],
    });
    quickSort(left, pivotIndex - 1);
    quickSort(pivotIndex + 1, right);
  }

  function partition(left: number, right: number): number {
    const pivot = array[right];
    let i = left;
    //* Step: show pivot selection
    steps.push({
      array: [...array],
      comparingIndices: [right, i],
      sortedIndices: [...sortedIndices],
    });
    for (let j = left; j < right; j++) {
      //* Step: show comparison
      steps.push({
        array: [...array],
        comparingIndices: [j, right],
        sortedIndices: [...sortedIndices],
      });
      if (array[j] < pivot) {
        if (i !== j) {
          //* Step: show swap
          [array[i], array[j]] = [array[j], array[i]];
          steps.push({
            array: [...array],
            swappingIndices: [i, j],
            sortedIndices: [...sortedIndices],
          });
        }
        i++;
      }
    }
    //* Swap pivot to correct place
    [array[i], array[right]] = [array[right], array[i]];
    steps.push({
      array: [...array],
      swappingIndices: [i, right],
      sortedIndices: [...sortedIndices],
    });
    return i;
  }

  quickSort(0, array.length - 1);

  //* Mark all as sorted at the end
  for (let idx = 0; idx < array.length; idx++) {
    if (!sortedIndices.includes(idx)) {
      sortedIndices.push(idx);
      steps.push({
        array: [...array],
        sortedIndices: [...sortedIndices],
      });
    }
  }

  return steps;
}

export default generateQuickSortSteps;
