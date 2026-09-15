import { describe, it, expect } from "vitest";
import { areCellDisplayPropsEqual } from "./cellDisplay";
import type { MemoizedCellProps } from "./MemoizedCell";

describe("MemoizedCell areCellDisplayPropsEqual", () => {
  const baseProps: MemoizedCellProps = {
    cellKey: "2-3",
    cellSize: 28,
    row: 2,
    col: 3,
    displayState: {
      bgColor: "transparent",
      isWall: false,
      elevationLabel: undefined,
      gradientArrow: undefined,
    },
    onMouseDown: () => {},
    onMouseEnter: () => {},
  };

  it("returns true when event handlers change but displayState and cellSize are identical", () => {
    const prevProps: MemoizedCellProps = {
      ...baseProps,
      onMouseDown: () => {},
      onMouseEnter: () => {},
    };
    const nextProps: MemoizedCellProps = {
      ...baseProps,
      onMouseDown: () => {},
      onMouseEnter: () => {},
    };

    expect(areCellDisplayPropsEqual(prevProps, nextProps)).toBe(true);
  });

  it("returns false when isWall or bgColor changes", () => {
    const prevProps: MemoizedCellProps = {
      ...baseProps,
      displayState: { ...baseProps.displayState, isWall: false, bgColor: "transparent" },
    };
    const nextProps: MemoizedCellProps = {
      ...baseProps,
      displayState: { ...baseProps.displayState, isWall: true, bgColor: "#1a88e2" },
    };

    expect(areCellDisplayPropsEqual(prevProps, nextProps)).toBe(false);
  });

  it("returns false when cellSize changes", () => {
    const prevProps: MemoizedCellProps = { ...baseProps, cellSize: 28 };
    const nextProps: MemoizedCellProps = { ...baseProps, cellSize: 20 };

    expect(areCellDisplayPropsEqual(prevProps, nextProps)).toBe(false);
  });

  it("returns false when elevationLabel changes", () => {
    const prevProps: MemoizedCellProps = {
      ...baseProps,
      displayState: { ...baseProps.displayState, elevationLabel: 15 },
    };
    const nextProps: MemoizedCellProps = {
      ...baseProps,
      displayState: { ...baseProps.displayState, elevationLabel: 30 },
    };

    expect(areCellDisplayPropsEqual(prevProps, nextProps)).toBe(false);
  });

  it("returns false when gradientArrow changes", () => {
    const prevProps: MemoizedCellProps = {
      ...baseProps,
      displayState: {
        ...baseProps.displayState,
        gradientArrow: { rotationDeg: 45, opacity: 0.5, isUnstable: false },
      },
    };
    const nextProps: MemoizedCellProps = {
      ...baseProps,
      displayState: {
        ...baseProps.displayState,
        gradientArrow: { rotationDeg: 90, opacity: 0.8, isUnstable: false },
      },
    };

    expect(areCellDisplayPropsEqual(prevProps, nextProps)).toBe(false);
  });
});
