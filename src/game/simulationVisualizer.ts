import type { Heading } from "../shared/types";
import { getHeadingRotation } from "../config/simulationConfig";

export interface ActorElements {
  robot?: HTMLElement | null;
  robotArrow?: HTMLElement | SVGElement | null;
  destination?: HTMLElement | null;
}

/**
 * Coarse-grained visualizer seam.
 * Decouples simulation engine and terrain mutations from low-level DOM queries,
 * dataset manipulations, inline CSS styles, and animation transitions.
 */
export interface SimulationVisualizer {
  // --- Search Progress Visuals ---
  renderSearchNode(key: string, type: "open" | "closed", theme: "manhattan" | "energy"): void;
  clearSearchVisuals(): void;
  /** Backwards compatibility alias for clearSearchVisuals */
  clearAllSearchVisuals?(): void;

  // --- Actor Kinematics & Posture ---
  bindActors(elements: ActorElements): void;
  unbindActors(): void;
  setRobotPosition(col: number, row: number, cellSize: number, animated?: boolean): void;
  setRobotHeading(heading: Heading, animated?: boolean): void;
  resetRobot(col: number, row: number, heading: Heading, cellSize: number): void;
  setDestinationPosition(col: number, row: number, cellSize: number): void;
  setDraggingActor?(actor: "robot" | "destination" | null): void;

  // --- Transient Terrain Stroke Previews ---
  previewCell(key: string, color: string, isWall?: boolean): void;
  clearCellPreview(key: string, restoreWall?: boolean): void;
  clearAllCellPreviews(keys: Iterable<string>): void;
}

/**
 * Browser DOM adapter implementing the SimulationVisualizer seam.
 * Executes direct DOM manipulations (dataset, style, classList, CSS transforms)
 * for peak rendering performance without triggering React component tree re-renders.
 */
export class DomVisualizer implements SimulationVisualizer {
  private actors: ActorElements = {};

  public bindActors(elements: ActorElements): void {
    this.actors = { ...elements };
  }

  public unbindActors(): void {
    this.actors = {};
  }

  private getRobotNode(): HTMLElement | null {
    if (this.actors.robot) return this.actors.robot;
    if (typeof document !== "undefined") {
      return document.getElementById("robot-actor");
    }
    return null;
  }

  private getRobotArrowNode(): HTMLElement | SVGElement | null {
    if (this.actors.robotArrow) return this.actors.robotArrow;
    if (typeof document !== "undefined") {
      return (document.getElementById("robot-actor-arrow") as unknown as HTMLElement | SVGElement | null);
    }
    return null;
  }

  private getDestinationNode(): HTMLElement | null {
    if (this.actors.destination) return this.actors.destination;
    if (typeof document !== "undefined") {
      return document.getElementById("destination-actor");
    }
    return null;
  }

  public renderSearchNode(key: string, type: "open" | "closed", theme: "manhattan" | "energy"): void {
    if (typeof document === "undefined") return;
    const node = document.getElementById(`cell-${key}`);
    if (node) {
      node.dataset[theme] = type;
    }
  }

  public clearSearchVisuals(): void {
    if (typeof document === "undefined") return;
    document.querySelectorAll("[data-manhattan], [data-energy], [data-path]").forEach((el) => {
      const node = el as HTMLElement;
      delete node.dataset.manhattan;
      delete node.dataset.energy;
      delete node.dataset.path;
    });
  }

  public clearAllSearchVisuals(): void {
    this.clearSearchVisuals();
  }

  public setRobotPosition(col: number, row: number, cellSize: number, animated = false): void {
    const node = this.getRobotNode();
    if (node) {
      node.style.transition = animated ? "transform 0.2s linear" : "none";
      node.style.willChange = animated ? "transform" : "auto";
      node.style.transform = `translate3d(${col * cellSize}px, ${row * cellSize}px, 0)`;
    }
  }

  public setRobotHeading(heading: Heading, animated = false): void {
    const node = this.getRobotArrowNode();
    if (node) {
      node.style.display = heading && heading !== "NONE" ? "block" : "none";
      node.style.transition = animated ? "transform 0.2s ease-in-out" : "none";
      node.style.transform = `rotate(${getHeadingRotation(heading)})`;
    }
  }

  public resetRobot(col: number, row: number, heading: Heading, cellSize: number): void {
    const node = this.getRobotNode();
    if (node) {
      node.style.transition = "none";
      node.style.willChange = "auto";
      node.style.transform = `translate3d(${col * cellSize}px, ${row * cellSize}px, 0)`;
    }
    const arrowNode = this.getRobotArrowNode();
    if (arrowNode) {
      arrowNode.style.display = heading && heading !== "NONE" ? "block" : "none";
      arrowNode.style.transition = "none";
      arrowNode.style.transform = `rotate(${getHeadingRotation(heading)})`;
    }
  }

  public setDestinationPosition(col: number, row: number, cellSize: number): void {
    const node = this.getDestinationNode();
    if (node) {
      node.style.transition = "none";
      node.style.willChange = "auto";
      node.style.transform = `translate3d(${col * cellSize}px, ${row * cellSize}px, 0)`;
    }
  }

  public setDraggingActor(actor: "robot" | "destination" | null): void {
    const robotEl = this.getRobotNode();
    if (robotEl) {
      robotEl.style.pointerEvents = actor === "robot" ? "none" : "auto";
      robotEl.style.cursor = actor === "robot" ? "grabbing" : "grab";
    }
    const destEl = this.getDestinationNode();
    if (destEl) {
      destEl.style.pointerEvents = actor === "destination" ? "none" : "auto";
      destEl.style.cursor = actor === "destination" ? "grabbing" : "grab";
    }
  }

  public previewCell(key: string, color: string, isWall?: boolean): void {
    if (typeof document === "undefined") return;
    const node = document.getElementById(`cell-${key}`);
    if (node) {
      node.style.backgroundColor = color;
      if (isWall === true) {
        node.classList.add("is-wall");
      } else if (isWall === false) {
        node.classList.remove("is-wall");
      }
    }
  }

  public clearCellPreview(key: string, restoreWall?: boolean): void {
    if (typeof document === "undefined") return;
    const node = document.getElementById(`cell-${key}`);
    if (node) {
      node.style.backgroundColor = "";
      if (restoreWall === true) {
        node.classList.add("is-wall");
      } else if (restoreWall === false) {
        node.classList.remove("is-wall");
      }
    }
  }

  public clearAllCellPreviews(keys: Iterable<string>): void {
    if (typeof document === "undefined") return;
    for (const key of keys) {
      const node = document.getElementById(`cell-${key}`);
      if (node) {
        node.style.backgroundColor = "";
        node.classList.remove("is-wall");
      }
    }
  }
}

/**
 * Headless Null adapter implementing the SimulationVisualizer seam.
 * Executes all visual commands as safe zero-overhead no-ops for headless benchmarks
 * and tests that do not need visual telemetry.
 */
export class NullVisualizer implements SimulationVisualizer {
  public bindActors(): void {}
  public unbindActors(): void {}
  public renderSearchNode(): void {}
  public clearSearchVisuals(): void {}
  public clearAllSearchVisuals(): void {}
  public setRobotPosition(): void {}
  public setRobotHeading(): void {}
  public resetRobot(): void {}
  public setDestinationPosition(): void {}
  public setDraggingActor(): void {}
  public previewCell(): void {}
  public clearCellPreview(): void {}
  public clearAllCellPreviews(): void {}
}

/**
 * In-memory recording visualizer for unit tests.
 * Captures rendered search steps, robot postures, and cell preview changes
 * without requiring real or mocked DOM trees.
 */
export class MemoryVisualizer implements SimulationVisualizer {
  public boundActors: ActorElements = {};
  public searchNodes: { key: string; type: "open" | "closed"; theme: "manhattan" | "energy" }[] = [];
  public searchVisualsCleared: boolean = false;
  public robotPositions: { col: number; row: number; cellSize: number; animated?: boolean }[] = [];
  public robotHeadings: { heading: Heading; animated?: boolean }[] = [];
  public robotResets: { col: number; row: number; heading: Heading; cellSize: number }[] = [];
  public destinationPositions: { col: number; row: number; cellSize: number }[] = [];
  public draggingActor: "robot" | "destination" | null = null;
  public previews: Map<string, { color: string; isWall?: boolean }> = new Map();

  public bindActors(elements: ActorElements): void {
    this.boundActors = { ...elements };
  }

  public unbindActors(): void {
    this.boundActors = {};
  }

  public renderSearchNode(key: string, type: "open" | "closed", theme: "manhattan" | "energy"): void {
    this.searchNodes.push({ key, type, theme });
  }

  public clearSearchVisuals(): void {
    this.searchNodes = [];
    this.searchVisualsCleared = true;
  }

  public clearAllSearchVisuals(): void {
    this.clearSearchVisuals();
  }

  public setRobotPosition(col: number, row: number, cellSize: number, animated = false): void {
    this.robotPositions.push({ col, row, cellSize, animated });
  }

  public setRobotHeading(heading: Heading, animated = false): void {
    this.robotHeadings.push({ heading, animated });
  }

  public resetRobot(col: number, row: number, heading: Heading, cellSize: number): void {
    this.robotResets.push({ col, row, heading, cellSize });
  }

  public setDestinationPosition(col: number, row: number, cellSize: number): void {
    this.destinationPositions.push({ col, row, cellSize });
  }

  public setDraggingActor(actor: "robot" | "destination" | null): void {
    this.draggingActor = actor;
  }

  public previewCell(key: string, color: string, isWall?: boolean): void {
    this.previews.set(key, { color, isWall });
  }

  public clearCellPreview(key: string, restoreWall?: boolean): void {
    const existing = this.previews.get(key);
    if (existing) {
      existing.color = "";
      if (restoreWall !== undefined) {
        existing.isWall = restoreWall;
      }
    }
  }

  public clearAllCellPreviews(keys: Iterable<string>): void {
    for (const key of keys) {
      this.previews.set(key, { color: "", isWall: false });
    }
  }
}

/**
 * Creates the default visualizer depending on the runtime environment.
 * Selects DomVisualizer when document is available; otherwise NullVisualizer.
 */
export function createDefaultVisualizer(): SimulationVisualizer {
  if (typeof document !== "undefined") {
    return new DomVisualizer();
  }
  return new NullVisualizer();
}

// --- Backwards Compatibility Aliases ---
export type SimulationDomAdapter = SimulationVisualizer;
export interface SimulationDomElement {
  style: { backgroundColor: string };
  classList: {
    add: (className: string) => void;
    remove: (className: string) => void;
  };
  dataset: Record<string, string | undefined>;
}
export const createDefaultDomAdapter = createDefaultVisualizer;
