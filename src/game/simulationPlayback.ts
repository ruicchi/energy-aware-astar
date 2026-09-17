import type { Heading, VisitedNode } from "../shared/types";
import { getHeading } from "../physics/terrainPhysics";

export interface TimelineFrame {
  delayMs: number;
  execute: () => void;
  tag?: string;
}

export type PlaybackStatus = "idle" | "playing" | "paused";

/**
 * The deep SimulationPlayback module.
 * Encapsulates discrete timeline execution, frame scheduling, run cancellation tokens,
 * manual frame stepping, immediate flushing, and playback lifecycle states across
 * pathfinding search animation and vehicle locomotion playback.
 */
export class SimulationPlayback {
  private status: PlaybackStatus = "idle";
  private currentRunId: number = 0;
  private activeTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private frames: TimelineFrame[] = [];
  private currentFrameIndex: number = 0;
  private onFinishCallback: (() => void) | null = null;

  public getStatus(): PlaybackStatus {
    return this.status;
  }

  public isPlaying(): boolean {
    return this.status === "playing";
  }

  public isPaused(): boolean {
    return this.status === "paused";
  }

  public getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  public getTotalFrames(): number {
    return this.frames.length;
  }

  public play(frames: TimelineFrame[], onFinish?: () => void): void {
    this.stop();
    this.currentRunId += 1;
    const runId = this.currentRunId;

    this.frames = [...frames];
    this.currentFrameIndex = 0;
    this.onFinishCallback = onFinish ?? null;

    if (this.frames.length === 0) {
      this.status = "idle";
      this.onFinishCallback?.();
      return;
    }

    this.status = "playing";
    this.scheduleNext(runId);
  }

  private scheduleNext(runId: number): void {
    if (this.currentFrameIndex >= this.frames.length) {
      this.status = "idle";
      const cb = this.onFinishCallback;
      this.onFinishCallback = null;
      cb?.();
      return;
    }

    const frame = this.frames[this.currentFrameIndex];
    this.activeTimeoutId = setTimeout(() => {
      if (runId !== this.currentRunId || this.status !== "playing") return;
      frame.execute();
      this.currentFrameIndex += 1;
      this.scheduleNext(runId);
    }, frame.delayMs);
  }

  public stop(): void {
    this.currentRunId += 1;
    if (this.activeTimeoutId !== null) {
      clearTimeout(this.activeTimeoutId);
      this.activeTimeoutId = null;
    }
    this.frames = [];
    this.currentFrameIndex = 0;
    this.onFinishCallback = null;
    this.status = "idle";
  }

  public pause(): void {
    if (this.status !== "playing") return;
    if (this.activeTimeoutId !== null) {
      clearTimeout(this.activeTimeoutId);
      this.activeTimeoutId = null;
    }
    this.status = "paused";
  }

  public resume(): void {
    if (this.status !== "paused") return;
    this.status = "playing";
    this.scheduleNext(this.currentRunId);
  }

  public step(): boolean {
    if (this.currentFrameIndex >= this.frames.length) return false;
    if (this.activeTimeoutId !== null) {
      clearTimeout(this.activeTimeoutId);
      this.activeTimeoutId = null;
    }
    const frame = this.frames[this.currentFrameIndex];
    frame.execute();
    this.currentFrameIndex += 1;
    if (this.currentFrameIndex >= this.frames.length) {
      this.status = "idle";
      const cb = this.onFinishCallback;
      this.onFinishCallback = null;
      cb?.();
    } else if (this.status === "playing") {
      this.status = "paused";
    }
    return true;
  }

  public flush(): void {
    if (this.activeTimeoutId !== null) {
      clearTimeout(this.activeTimeoutId);
      this.activeTimeoutId = null;
    }
    while (this.currentFrameIndex < this.frames.length) {
      const frame = this.frames[this.currentFrameIndex];
      frame.execute();
      this.currentFrameIndex += 1;
    }
    this.status = "idle";
    const cb = this.onFinishCallback;
    this.onFinishCallback = null;
    cb?.();
  }
}

// --- Timeline Builders ---

export interface SearchTimelineParams {
  visitedNodes: VisitedNode[];
  delayMs: number;
  onVisit: (node: VisitedNode) => void;
}

export function compileSearchTimeline({
  visitedNodes,
  delayMs,
  onVisit,
}: SearchTimelineParams): TimelineFrame[] {
  return visitedNodes.map((node) => ({
    delayMs,
    execute: () => onVisit(node),
    tag: `search-visit-${node.key}`,
  }));
}

export interface WalkFailurePoint {
  step: number;
  row: number;
  col: number;
  reason: string;
}

export interface WalkTimelineParams {
  path: string[];
  initialHeading: Heading;
  stepDelayMs: number;
  rotateDelayMs: number;
  onRotate: (heading: Heading) => void;
  onStep: (col: number, row: number, stepIndex: number) => void;
  failure?: WalkFailurePoint | null;
  onFailure?: (failure: { row: number; col: number; reason: string }) => void;
}

export function compileWalkTimeline({
  path,
  initialHeading,
  stepDelayMs,
  rotateDelayMs,
  onRotate,
  onStep,
  failure,
  onFailure,
}: WalkTimelineParams): TimelineFrame[] {
  const frames: TimelineFrame[] = [];
  let currentRobotHeading: Heading = initialHeading;

  for (let i = 1; i < path.length; i++) {
    const [currR, currC] = path[i].split("-").map(Number);
    const nextHeading = getHeading(path[i - 1], path[i]);

    if (failure && failure.step === i) {
      frames.push({
        delayMs: stepDelayMs,
        execute: () => onFailure?.({ row: failure.row, col: failure.col, reason: failure.reason }),
        tag: `walk-fail-${failure.row}-${failure.col}`,
      });
      break;
    }

    if (
      currentRobotHeading !== "NONE" &&
      nextHeading !== "NONE" &&
      nextHeading !== currentRobotHeading
    ) {
      const headingToApply = nextHeading;
      frames.push({
        delayMs: rotateDelayMs,
        execute: () => onRotate(headingToApply),
        tag: `walk-rotate-${headingToApply}`,
      });
      currentRobotHeading = nextHeading;
    }

    const stepIndex = i;
    frames.push({
      delayMs: stepDelayMs,
      execute: () => onStep(currC, currR, stepIndex),
      tag: `walk-step-${stepIndex}`,
    });
  }

  return frames;
}
