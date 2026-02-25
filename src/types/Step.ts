export interface Step {
  array: number[];                    //* Current state of array
  comparingIndices?: [number, number]; //* Which two we're comparing
  swappingIndices?: [number, number];  //* Which two are swapping
  sortedIndices?: number[];            //* Which positions are fully sorted
}