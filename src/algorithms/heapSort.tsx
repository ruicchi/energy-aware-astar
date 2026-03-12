//# heap sort algorithm

function generateHeapSortSteps(inputArray: number[]): Step[] {
  const array = [...inputArray];
  const steps = [];
  const sortedIndices: number[] = [];

  // Push initial state
  steps.push({
    array: [...array],
    sortedIndices: [...sortedIndices],
  });

  const n = array.length;

  // Heapify subtree rooted at index i
  function heapify(n: number, i: number) {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    // Compare left child
    if (left < n) {
      steps.push({
        array: [...array],
        comparingIndices: [largest, left],
        sortedIndices: [...sortedIndices],
      });
      if (array[left] > array[largest]) {
        largest = left;
      }
    }

    // Compare right child
    if (right < n) {
      steps.push({
        array: [...array],
        comparingIndices: [largest, right],
        sortedIndices: [...sortedIndices],
      });
      if (array[right] > array[largest]) {
        largest = right;
      }
    }

    // If root is not largest, swap and continue heapifying
    if (largest !== i) {
      [array[i], array[largest]] = [array[largest], array[i]];
      steps.push({
        array: [...array],
        swappingIndices: [i, largest],
        sortedIndices: [...sortedIndices],
      });
      heapify(n, largest);
    }
  }

  // Build max heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i);
  }

  // Extract elements from heap one by one
  for (let i = n - 1; i > 0; i--) {
    // Swap root (max) with last element
    [array[0], array[i]] = [array[i], array[0]];
    sortedIndices.unshift(i); // Mark as sorted
    steps.push({
      array: [...array],
      swappingIndices: [0, i],
      sortedIndices: [...sortedIndices],
    });
    // Heapify reduced heap
    heapify(i, 0);
  }
  // Mark the first element as sorted
  sortedIndices.unshift(0);
  steps.push({
    array: [...array],
    sortedIndices: [...sortedIndices],
  });

  return steps;
}

export default generateHeapSortSteps;
