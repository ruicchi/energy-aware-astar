import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DomVisualizer,
  NullVisualizer,
  MemoryVisualizer,
  createDefaultVisualizer,
} from "./simulationVisualizer";

describe("SimulationVisualizer (Coarse-Grained Visualizer Seam)", () => {
  describe("NullVisualizer", () => {
    it("safely handles all operations as no-ops without throwing", () => {
      const visualizer = new NullVisualizer();

      expect(() => {
        visualizer.renderSearchNode("0-0", "open", "energy");
        visualizer.clearSearchVisuals();
        visualizer.setRobotPosition(2, 3, 20, true);
        visualizer.setRobotHeading("UP", true);
        visualizer.resetRobot(0, 0, "RIGHT", 20);
        visualizer.previewCell("1-1", "#ff0000", true);
        visualizer.clearCellPreview("1-1", false);
        visualizer.clearAllCellPreviews(["1-1", "1-2"]);
      }).not.toThrow();
    });
  });

  describe("MemoryVisualizer", () => {
    it("captures search node renderings and clear events", () => {
      const visualizer = new MemoryVisualizer();

      visualizer.renderSearchNode("1-1", "open", "energy");
      visualizer.renderSearchNode("1-2", "closed", "energy");

      expect(visualizer.searchNodes).toEqual([
        { key: "1-1", type: "open", theme: "energy" },
        { key: "1-2", type: "closed", theme: "energy" },
      ]);
      expect(visualizer.searchVisualsCleared).toBe(false);

      visualizer.clearSearchVisuals();
      expect(visualizer.searchNodes).toEqual([]);
      expect(visualizer.searchVisualsCleared).toBe(true);
    });

    it("captures robot kinematic positions, headings, and resets", () => {
      const visualizer = new MemoryVisualizer();

      visualizer.setRobotPosition(2, 4, 30, true);
      visualizer.setRobotHeading("DOWN", true);
      visualizer.resetRobot(0, 0, "RIGHT", 30);

      expect(visualizer.robotPositions).toEqual([
        { col: 2, row: 4, cellSize: 30, animated: true },
      ]);
      expect(visualizer.robotHeadings).toEqual([
        { heading: "DOWN", animated: true },
      ]);
      expect(visualizer.robotResets).toEqual([
        { col: 0, row: 0, heading: "RIGHT", cellSize: 30 },
      ]);
    });

    it("captures cell previews and clears them accurately", () => {
      const visualizer = new MemoryVisualizer();

      visualizer.previewCell("2-2", "#1a88e2", true);
      expect(visualizer.previews.get("2-2")).toEqual({ color: "#1a88e2", isWall: true });

      visualizer.clearCellPreview("2-2", false);
      expect(visualizer.previews.get("2-2")).toEqual({ color: "", isWall: false });

      visualizer.previewCell("3-3", "#ff0000", false);
      visualizer.clearAllCellPreviews(["2-2", "3-3"]);
      expect(visualizer.previews.get("2-2")).toEqual({ color: "", isWall: false });
      expect(visualizer.previews.get("3-3")).toEqual({ color: "", isWall: false });
    });
  });

  describe("DomVisualizer (DOM Environment)", () => {
    let mockElements: Map<string, {
      style: Record<string, string>;
      classList: Set<string>;
      dataset: Record<string, string | undefined>;
    }>;

    beforeEach(() => {
      mockElements = new Map();

      function getOrCreate(id: string) {
        if (!mockElements.has(id)) {
          mockElements.set(id, {
            style: {},
            classList: new Set(),
            dataset: {},
          });
        }
        const record = mockElements.get(id)!;
        return {
          id,
          style: record.style,
          classList: {
            add: (c: string) => record.classList.add(c),
            remove: (c: string) => record.classList.delete(c),
            contains: (c: string) => record.classList.has(c),
          },
          dataset: record.dataset,
        };
      }

      (globalThis as unknown as { document: unknown }).document = {
        getElementById: (id: string) => getOrCreate(id),
        querySelectorAll: () => {
          const results: { dataset: Record<string, string | undefined> }[] = [];
          for (const rec of mockElements.values()) {
            results.push({ dataset: rec.dataset });
          }
          return results;
        },
      };
    });

    afterEach(() => {
      delete (globalThis as unknown as { document?: unknown }).document;
    });

    it("manipulates dataset attributes for search nodes", () => {
      const visualizer = new DomVisualizer();
      visualizer.renderSearchNode("2-3", "open", "manhattan");
      expect(mockElements.get("cell-2-3")?.dataset.manhattan).toBe("open");

      visualizer.renderSearchNode("2-3", "closed", "manhattan");
      expect(mockElements.get("cell-2-3")?.dataset.manhattan).toBe("closed");

      visualizer.clearSearchVisuals();
      expect(mockElements.get("cell-2-3")?.dataset.manhattan).toBeUndefined();
    });

    it("applies and clears inline styles and wall classes for cell previews", () => {
      const visualizer = new DomVisualizer();
      visualizer.previewCell("4-5", "#1a88e2", true);
      expect(mockElements.get("cell-4-5")?.style.backgroundColor).toBe("#1a88e2");
      expect(mockElements.get("cell-4-5")?.classList.has("is-wall")).toBe(true);

      visualizer.clearCellPreview("4-5", false);
      expect(mockElements.get("cell-4-5")?.style.backgroundColor).toBe("");
      expect(mockElements.get("cell-4-5")?.classList.has("is-wall")).toBe(false);
    });

    it("manipulates robot-actor and robot-actor-arrow elements", () => {
      const visualizer = new DomVisualizer();
      visualizer.setRobotPosition(3, 5, 20, true);
      expect(mockElements.get("robot-actor")?.style.transform).toBe("translate3d(60px, 100px, 0)");
      expect(mockElements.get("robot-actor")?.style.transition).toBe("transform 0.2s linear");

      visualizer.setRobotHeading("DOWN", true);
      expect(mockElements.get("robot-actor-arrow")?.style.transform).toBe("rotate(90deg)");

      visualizer.resetRobot(1, 2, "UP", 20);
      expect(mockElements.get("robot-actor")?.style.transform).toBe("translate3d(20px, 40px, 0)");
      expect(mockElements.get("robot-actor")?.style.transition).toBe("none");
      expect(mockElements.get("robot-actor-arrow")?.style.transform).toBe("rotate(-90deg)");
    });
  });

  describe("createDefaultVisualizer", () => {
    it("creates NullVisualizer when document is absent and DomVisualizer when present", () => {
      expect(createDefaultVisualizer()).toBeInstanceOf(NullVisualizer);

      (globalThis as unknown as { document: unknown }).document = {
        getElementById: () => null,
      };
      try {
        expect(createDefaultVisualizer()).toBeInstanceOf(DomVisualizer);
      } finally {
        delete (globalThis as unknown as { document?: unknown }).document;
      }
    });
  });
});
