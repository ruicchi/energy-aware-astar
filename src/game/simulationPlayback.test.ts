import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SimulationPlayback,
  compileSearchTimeline,
  compileWalkTimeline,
  type TimelineFrame,
} from "./simulationPlayback";
import type { VisitedNode } from "../shared/types";

describe("SimulationPlayback (Deep Playback Module)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plays timeline frames sequentially and invokes finish callback", () => {
    const playback = new SimulationPlayback();
    const calls: number[] = [];
    const onFinish = vi.fn();

    const frames: TimelineFrame[] = [
      { delayMs: 10, execute: () => calls.push(1) },
      { delayMs: 20, execute: () => calls.push(2) },
      { delayMs: 30, execute: () => calls.push(3) },
    ];

    playback.play(frames, onFinish);
    expect(playback.isPlaying()).toBe(true);
    expect(playback.getStatus()).toBe("playing");
    expect(calls).toEqual([]);

    vi.advanceTimersByTime(10);
    expect(calls).toEqual([1]);

    vi.advanceTimersByTime(20);
    expect(calls).toEqual([1, 2]);

    vi.advanceTimersByTime(30);
    expect(calls).toEqual([1, 2, 3]);
    expect(playback.isPlaying()).toBe(false);
    expect(playback.getStatus()).toBe("idle");
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("cancels running playback immediately when stopped", () => {
    const playback = new SimulationPlayback();
    const calls: number[] = [];
    const onFinish = vi.fn();

    playback.play(
      [
        { delayMs: 10, execute: () => calls.push(1) },
        { delayMs: 20, execute: () => calls.push(2) },
      ],
      onFinish,
    );

    vi.advanceTimersByTime(10);
    expect(calls).toEqual([1]);

    playback.stop();
    expect(playback.getStatus()).toBe("idle");
    expect(playback.isPlaying()).toBe(false);

    vi.advanceTimersByTime(50);
    expect(calls).toEqual([1]); // No further calls
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("supports pause and resume", () => {
    const playback = new SimulationPlayback();
    const calls: number[] = [];
    const onFinish = vi.fn();

    playback.play(
      [
        { delayMs: 10, execute: () => calls.push(1) },
        { delayMs: 20, execute: () => calls.push(2) },
      ],
      onFinish,
    );

    vi.advanceTimersByTime(10);
    expect(calls).toEqual([1]);

    playback.pause();
    expect(playback.isPaused()).toBe(true);
    expect(playback.getStatus()).toBe("paused");

    vi.advanceTimersByTime(50);
    expect(calls).toEqual([1]);

    playback.resume();
    expect(playback.isPlaying()).toBe(true);

    vi.advanceTimersByTime(20);
    expect(calls).toEqual([1, 2]);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("executes frames synchronously one by one via step() without timer advancement", () => {
    const playback = new SimulationPlayback();
    const calls: number[] = [];
    const onFinish = vi.fn();

    playback.play(
      [
        { delayMs: 100, execute: () => calls.push(1) },
        { delayMs: 200, execute: () => calls.push(2) },
      ],
      onFinish,
    );

    // Step first frame manually
    const stepped1 = playback.step();
    expect(stepped1).toBe(true);
    expect(calls).toEqual([1]);
    expect(playback.getCurrentFrameIndex()).toBe(1);

    // Step second frame manually
    const stepped2 = playback.step();
    expect(stepped2).toBe(true);
    expect(calls).toEqual([1, 2]);
    expect(playback.getStatus()).toBe("idle");
    expect(onFinish).toHaveBeenCalledTimes(1);

    // Stepping past end returns false
    expect(playback.step()).toBe(false);
  });

  it("flushes all remaining frames synchronously to immediate completion via flush()", () => {
    const playback = new SimulationPlayback();
    const calls: number[] = [];
    const onFinish = vi.fn();

    playback.play(
      [
        { delayMs: 500, execute: () => calls.push(1) },
        { delayMs: 500, execute: () => calls.push(2) },
        { delayMs: 500, execute: () => calls.push(3) },
      ],
      onFinish,
    );

    playback.flush();
    expect(calls).toEqual([1, 2, 3]);
    expect(playback.getStatus()).toBe("idle");
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("compileSearchTimeline formats visited nodes correctly", () => {
    const visited: VisitedNode[] = [
      { key: "0-0", type: "open" },
      { key: "0-1", type: "closed" },
    ];
    const visits: string[] = [];

    const frames = compileSearchTimeline({
      visitedNodes: visited,
      delayMs: 15,
      onVisit: (node) => visits.push(`${node.key}:${node.type}`),
    });

    expect(frames.length).toBe(2);
    expect(frames[0].delayMs).toBe(15);
    frames[0].execute();
    frames[1].execute();
    expect(visits).toEqual(["0-0:open", "0-1:closed"]);
  });

  it("compileWalkTimeline handles turning, moving, and pre-evaluated failure points", () => {
    const path = ["0-0", "0-1", "1-1"];
    const rotates: string[] = [];
    const steps: number[] = [];
    let failure: { row: number; col: number; reason: string } | null = null;

    const frames = compileWalkTimeline({
      path,
      initialHeading: "RIGHT",
      stepDelayMs: 200,
      rotateDelayMs: 100,
      onRotate: (h) => rotates.push(h),
      onStep: (_c, _r, stepIdx) => steps.push(stepIdx),
      onFailure: (f) => {
        failure = f;
      },
    });

    // 0-0 to 0-1 is RIGHT (no rotation needed, initial is RIGHT)
    // 0-1 to 1-1 is DOWN (rotation needed: DOWN)
    expect(frames.length).toBe(3); // move 1, rotate to DOWN, move 2
    frames.forEach((f) => f.execute());

    expect(rotates).toEqual(["DOWN"]);
    expect(steps).toEqual([1, 2]);
    expect(failure).toBeNull();
  });

  it("compileWalkTimeline halts and emits failure when encountering a pre-evaluated failure point", () => {
    const path = ["0-0", "0-1", "1-1"];
    const steps: number[] = [];
    let failure: { row: number; col: number; reason: string } | null = null;

    const frames = compileWalkTimeline({
      path,
      initialHeading: "RIGHT",
      stepDelayMs: 200,
      rotateDelayMs: 100,
      failure: {
        step: 2,
        row: 1,
        col: 1,
        reason: "EXCEEDED_MAX_SLOPE (35.0° > 30.0°)",
      },
      onRotate: () => {},
      onStep: (_c, _r, stepIdx) => steps.push(stepIdx),
      onFailure: (f) => {
        failure = f;
      },
    });

    // Step 1 executes normally, then step 2 triggers failure and halts
    expect(frames.length).toBe(2); // move 1, fail frame
    expect(frames[1].tag).toBe("walk-fail-1-1");
    frames.forEach((f) => f.execute());

    expect(steps).toEqual([1]);
    expect(failure).toEqual({
      row: 1,
      col: 1,
      reason: "EXCEEDED_MAX_SLOPE (35.0° > 30.0°)",
    });
  });
});
