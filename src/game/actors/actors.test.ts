import { describe, it, expect } from "vitest";

describe("Actor Coordinate Calculations", () => {
  it("translates robotNode string to grid pixel coordinates", () => {
    const robotNode = "3-5";
    const cellSize = 28;
    const [row, col] = robotNode.split("-").map(Number);
    const x = col * cellSize;
    const y = row * cellSize;

    expect(x).toBe(140);
    expect(y).toBe(84);
  });

  it("translates destinationNode string to grid pixel coordinates", () => {
    const destinationNode = "10-20";
    const cellSize = 20;
    const [row, col] = destinationNode.split("-").map(Number);
    const x = col * cellSize;
    const y = row * cellSize;

    expect(x).toBe(400);
    expect(y).toBe(200);
  });

  it("selects walking step coordinate when walking is active", () => {
    const currentPath = ["0-0", "0-1", "1-1", "2-1"];
    const walkingStep = 2;
    const [row, col] = currentPath[walkingStep].split("-").map(Number);

    expect(row).toBe(1);
    expect(col).toBe(1);
  });
});
