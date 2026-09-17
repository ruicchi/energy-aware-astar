import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DomVisualizer,
  NullVisualizer,
  MemoryVisualizer,
  createDefaultVisualizer,
  type ActorElements,
} from "./simulationVisualizer";
import { SimulationEngine } from "./simulationEngine";

interface MockElement {
  id?: string;
  style: Record<string, string>;
  dataset: Record<string, string | undefined>;
  classList: {
    add: (c: string) => void;
    remove: (c: string) => void;
    contains: (c: string) => boolean;
  };
}

function createMockElement(id?: string): MockElement {
  const classes = new Set<string>();
  return {
    id,
    style: {},
    dataset: {},
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
  };
}

describe("SimulationVisualizer - Unified Actor Authority & Port Seam", () => {
  const originalDocument = globalThis.document;
  let domRegistry: Map<string, MockElement>;

  beforeEach(() => {
    domRegistry = new Map<string, MockElement>();
    // Provide minimal mock document for Node test environment
    (globalThis as unknown as { document: unknown }).document = {
      getElementById: (id: string) => domRegistry.get(id) ?? null,
      querySelectorAll: () => [],
    };
  });

  afterEach(() => {
    (globalThis as unknown as { document: unknown }).document = originalDocument;
  });

  describe("DomVisualizer", () => {
    let visualizer: DomVisualizer;
    let mockRobot: MockElement;
    let mockArrow: MockElement;
    let mockDest: MockElement;

    beforeEach(() => {
      visualizer = new DomVisualizer();
      mockRobot = createMockElement("robot-actor");
      mockArrow = createMockElement("robot-actor-arrow");
      mockDest = createMockElement("destination-actor");
    });

    it("binds actor elements and manipulates bound element styles directly", () => {
      const actors: ActorElements = {
        robot: mockRobot as unknown as HTMLElement,
        robotArrow: mockArrow as unknown as SVGElement,
        destination: mockDest as unknown as HTMLElement,
      };

      visualizer.bindActors(actors);

      // Position robot
      visualizer.setRobotPosition(5, 3, 24, true);
      expect(mockRobot.style.transform).toBe("translate3d(120px, 72px, 0)");
      expect(mockRobot.style.transition).toBe("transform 0.2s linear");

      // Heading robot
      visualizer.setRobotHeading("RIGHT", true);
      expect(mockArrow.style.transform).toBe("rotate(0deg)");
      expect(mockArrow.style.display).toBe("block");

      // Set destination position
      visualizer.setDestinationPosition(10, 8, 24);
      expect(mockDest.style.transform).toBe("translate3d(240px, 192px, 0)");
      expect(mockDest.style.transition).toBe("none");

      // Reset robot posture
      visualizer.resetRobot(2, 4, "DOWN", 24);
      expect(mockRobot.style.transform).toBe("translate3d(48px, 96px, 0)");
      expect(mockRobot.style.transition).toBe("none");
      expect(mockArrow.style.transform).toBe("rotate(90deg)");
      expect(mockArrow.style.display).toBe("block");

      // Dragging state
      visualizer.setDraggingActor("robot");
      expect(mockRobot.style.pointerEvents).toBe("none");
      expect(mockRobot.style.cursor).toBe("grabbing");

      visualizer.setDraggingActor(null);
      expect(mockRobot.style.pointerEvents).toBe("auto");
      expect(mockRobot.style.cursor).toBe("grab");
    });

    it("unbinding actors clears direct references", () => {
      const actors: ActorElements = {
        robot: mockRobot as unknown as HTMLElement,
        robotArrow: mockArrow as unknown as SVGElement,
        destination: mockDest as unknown as HTMLElement,
      };

      visualizer.bindActors(actors);
      visualizer.unbindActors();

      // With no global DOM element present and unbound, no crash occurs
      expect(() => {
        visualizer.setRobotPosition(1, 1, 20);
        visualizer.setRobotHeading("UP");
        visualizer.setDestinationPosition(2, 2, 20);
      }).not.toThrow();
    });

    it("falls back to document.getElementById if actors were not bound", () => {
      const fallbackRobot = createMockElement("robot-actor");
      domRegistry.set("robot-actor", fallbackRobot);

      visualizer.setRobotPosition(2, 3, 30, false);
      expect(fallbackRobot.style.transform).toBe("translate3d(60px, 90px, 0)");
    });

    it("manipulates cell previews and search datasets correctly", () => {
      const cellEl = createMockElement("cell-4-5");
      domRegistry.set("cell-4-5", cellEl);

      // Search visualization
      visualizer.renderSearchNode("4-5", "open", "energy");
      expect(cellEl.dataset.energy).toBe("open");

      // Transient previews
      visualizer.previewCell("4-5", "red", true);
      expect(cellEl.style.backgroundColor).toBe("red");
      expect(cellEl.classList.contains("is-wall")).toBe(true);

      visualizer.clearCellPreview("4-5", false);
      expect(cellEl.style.backgroundColor).toBe("");
      expect(cellEl.classList.contains("is-wall")).toBe(false);
    });
  });

  describe("NullVisualizer", () => {
    it("safely executes all visualizer operations as zero-overhead no-ops", () => {
      const visualizer = new NullVisualizer();

      expect(() => {
        visualizer.bindActors({});
        visualizer.unbindActors();
        visualizer.renderSearchNode("0-0", "open", "manhattan");
        visualizer.clearSearchVisuals();
        visualizer.clearAllSearchVisuals();
        visualizer.setRobotPosition(1, 1, 24, true);
        visualizer.setRobotHeading("LEFT", true);
        visualizer.resetRobot(0, 0, "RIGHT", 24);
        visualizer.setDestinationPosition(5, 5, 24);
        visualizer.setDraggingActor("robot");
        visualizer.previewCell("1-1", "blue", true);
        visualizer.clearCellPreview("1-1", false);
        visualizer.clearAllCellPreviews(["1-1"]);
      }).not.toThrow();
    });
  });

  describe("MemoryVisualizer", () => {
    it("captures actor bindings and posture telemetry for tests", () => {
      const visualizer = new MemoryVisualizer();
      const mockRobot = createMockElement("robot") as unknown as HTMLElement;

      visualizer.bindActors({ robot: mockRobot });
      expect(visualizer.boundActors.robot).toBe(mockRobot);

      visualizer.setRobotPosition(3, 7, 24, true);
      expect(visualizer.robotPositions).toEqual([{ col: 3, row: 7, cellSize: 24, animated: true }]);

      visualizer.setRobotHeading("UP_LEFT", true);
      expect(visualizer.robotHeadings).toEqual([{ heading: "UP_LEFT", animated: true }]);

      visualizer.resetRobot(1, 2, "RIGHT", 28);
      expect(visualizer.robotResets).toEqual([{ col: 1, row: 2, heading: "RIGHT", cellSize: 28 }]);

      visualizer.setDestinationPosition(9, 9, 24);
      expect(visualizer.destinationPositions).toEqual([{ col: 9, row: 9, cellSize: 24 }]);

      visualizer.unbindActors();
      expect(visualizer.boundActors).toEqual({});
    });
  });

  describe("SimulationEngine - Actor Seam Integration", () => {
    it("engine.bindActors and syncVisualizerActors push coordinates to the visualizer", () => {
      const visualizer = new MemoryVisualizer();
      const engine = new SimulationEngine({
        cols: 20,
        rows: 20,
        cellSize: 30,
        visualizer,
      });

      const mockRobot = createMockElement("robot") as unknown as HTMLElement;
      const mockDest = createMockElement("dest") as unknown as HTMLElement;

      engine.bindActors({ robot: mockRobot, destination: mockDest });
      expect(visualizer.boundActors.robot).toBe(mockRobot);

      visualizer.robotResets = [];
      visualizer.destinationPositions = [];

      engine.syncVisualizerActors();

      expect(visualizer.robotResets.length).toBeGreaterThan(0);
      expect(visualizer.destinationPositions.length).toBeGreaterThan(0);

      engine.unbindActors();
      expect(visualizer.boundActors).toEqual({});
    });
  });

  describe("createDefaultVisualizer", () => {
    it("returns DomVisualizer when document is defined", () => {
      const defaultVisualizer = createDefaultVisualizer();
      expect(defaultVisualizer).toBeInstanceOf(DomVisualizer);
    });

    it("returns NullVisualizer when document is undefined", () => {
      (globalThis as unknown as { document: unknown }).document = undefined;
      const defaultVisualizer = createDefaultVisualizer();
      expect(defaultVisualizer).toBeInstanceOf(NullVisualizer);
    });
  });
});
