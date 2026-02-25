//# array generator hook

import { useState, useEffect, useCallback } from 'react';

export const useArrayGenerator = () => {

  //* initializing empty array and array size for random array generator
  const [array, setArray] = useState<number[]>([]);
  const [arraySize, setArraySize] = useState<number>(15);

  //* random array generator
  const generateNewArray = useCallback(() => {
    const newArray: number[] = [];
    for (let i = 0; i < arraySize; i++) {
      const randomValue = Math.floor(Math.random() * 100) + 15;
      newArray.push(randomValue);
    }
    setArray(newArray);
    return newArray;
  }, [arraySize]);

  //* listener that generates new array
  useEffect(() => {
    generateNewArray();
  }, [generateNewArray]);

  return {
    array,
    setArray,
    arraySize,
    setArraySize,
    generateNewArray,
  };
};