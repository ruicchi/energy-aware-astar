//# radix sort algorithm

function getMax(arr: number[]): number {
  return Math.max(...arr);
}

function getDigit(num: number, place: number): number {
  return Math.floor(Math.abs(num) / Math.pow(10, place)) % 10;
}

function getNumDigits(num: number): number {
  return Math.max(1, Math.floor(Math.log10(Math.abs(num))) + 1);
}

function generateRadixSortSteps(inputArray: number[]): Step[] {
  const array = [...inputArray];
  const steps = [];

  // Initial state
  steps.push({
    array: [...array],
    sortedIndices: [],
    comparingIndices: [],
    swappingIndices: [],
    activeIndices: [],
    description: 'Initial array',
  });

  const maxNum = getMax(array);
  const maxDigits = getNumDigits(maxNum);

  for (let digit = 0; digit < maxDigits; digit++) {
    // Buckets for each digit (0-9)
    const buckets: number[][] = Array.from({ length: 10 }, () => []);

    // Place numbers into buckets
    for (let i = 0; i < array.length; i++) {
      const currentDigit = getDigit(array[i], digit);
      buckets[currentDigit].push(array[i]);
      steps.push({
        array: [...array],
        sortedIndices: [],
        comparingIndices: [i],
        swappingIndices: [],
        activeIndices: [],
        description: `Place ${array[i]} in bucket ${currentDigit} (digit ${digit + 1})`,
      });
    }

    // Flatten buckets back into array
    let idx = 0;
    for (let b = 0; b < 10; b++) {
      for (const val of buckets[b]) {
        array[idx] = val;
        steps.push({
          array: [...array],
          sortedIndices: [],
          comparingIndices: [],
          swappingIndices: [idx],
          activeIndices: [],
          description: `Collect ${val} from bucket ${b} to position ${idx}`,
        });
        idx++;
      }
    }

    // Optionally mark sorted indices after each pass (not fully sorted until last pass)
    steps.push({
      array: [...array],
      sortedIndices: [],
      comparingIndices: [],
      swappingIndices: [],
      activeIndices: [],
      description: `After pass ${digit + 1}`,
    });
  }

  // Mark all sorted at the end
  steps.push({
    array: [...array],
    sortedIndices: Array.from({ length: array.length }, (_, idx) => idx),
    comparingIndices: [],
    swappingIndices: [],
    activeIndices: [],
    description: 'Array fully sorted',
  });

  return steps;
}

export default generateRadixSortSteps;
