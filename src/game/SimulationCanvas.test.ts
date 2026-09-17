import { describe, it, expect } from "vitest";
import { resolveRobotCoordinates } from "./cellDisplay";

describe("SimulationCanvas - Kinematic Actor Coordinate Calculations", () => {
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

  describe("resolveRobotCoordinates", () => {
    it("anchors to robotNode when not finished walking", () => {
      const coords = resolveRobotCoordinates({
        hasFinishedWalking: false,
        currentPath: ["2-3", "2-4", "2-5"],
        walkingStep: 0,
        robotNode: "2-3",
      });
      expect(coords).toEqual([2, 3]);
    });

    it("anchors to final step coordinate when walk has completed", () => {
      const coords = resolveRobotCoordinates({
        hasFinishedWalking: true,
        currentPath: ["2-3", "2-4", "2-5"],
        walkingStep: 2,
        robotNode: "2-3",
      });
      expect(coords).toEqual([2, 5]);
    });

    it("safely falls back to robotNode if currentPath is null or walkingStep is invalid", () => {
      const coords1 = resolveRobotCoordinates({
        hasFinishedWalking: true,
        currentPath: null,
        walkingStep: -1,
        robotNode: "4-6",
      });
      expect(coords1).toEqual([4, 6]);

      const coords2 = resolveRobotCoordinates({
        hasFinishedWalking: true,
        currentPath: ["4-6"],
        walkingStep: 10,
        robotNode: "4-6",
      });
      expect(coords2).toEqual([4, 6]);
    });
  });
});
