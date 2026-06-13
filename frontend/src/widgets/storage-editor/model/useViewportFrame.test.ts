import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useViewportFrame } from "./useViewportFrame";

describe("useViewportFrame", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(0), 0) as unknown as number;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("commits throttled updates through requestAnimationFrame", async () => {
    const { result } = renderHook(() => useViewportFrame(10));

    act(() => {
      result.current.commitFrame({ zoom: 1.2, x: 10, y: 20 }, false);
    });

    expect(result.current.frameRef.current.zoom).toBeCloseTo(1.2, 4);
    expect(result.current.frame.zoom).toBe(1);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });

    expect(result.current.frame.zoom).toBeCloseTo(1.2, 4);
    expect(result.current.frame.x).toBe(10);
  });

  it("applies immediate commits without waiting for animation frame", () => {
    const { result } = renderHook(() => useViewportFrame(10));

    act(() => {
      result.current.commitFrame({ zoom: 2, x: 0, y: 0 }, true);
    });

    expect(result.current.frame.zoom).toBe(2);
    expect(result.current.frameRef.current.zoom).toBe(2);
  });

  it("skips React state update when frame values are unchanged", () => {
    const { result } = renderHook(() => useViewportFrame(10));

    act(() => {
      result.current.commitFrame({ zoom: 2, x: 0, y: 0 }, true);
    });

    const frameAfterFirst = result.current.frame;

    act(() => {
      result.current.commitFrame({ zoom: 2, x: 0, y: 0 }, true);
    });

    expect(result.current.frame).toBe(frameAfterFirst);
  });
});
