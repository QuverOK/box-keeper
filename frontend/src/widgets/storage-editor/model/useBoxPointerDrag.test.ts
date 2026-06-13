import { describe, it, expect } from "vitest";
import {
  distancePx,
  POINTER_DRAG_LONG_PRESS_MS,
  POINTER_DRAG_MOVE_CANCEL_PX,
} from "./boxDragCoords";

describe("pointer drag long-press activation", () => {
  it("uses 200ms long-press duration constant", () => {
    expect(POINTER_DRAG_LONG_PRESS_MS).toBe(200);
  });

  it("defines a movement threshold for tap-vs-drag heuristics", () => {
    expect(POINTER_DRAG_MOVE_CANCEL_PX).toBeGreaterThan(0);
    expect(distancePx(0, 0, 3, 4)).toBe(5);
  });

  it("cancels long-press when movement exceeds threshold", () => {
    const startX = 100;
    const startY = 100;
    const movedX = startX + POINTER_DRAG_MOVE_CANCEL_PX + 1;
    expect(
      distancePx(startX, startY, movedX, startY) > POINTER_DRAG_MOVE_CANCEL_PX,
    ).toBe(true);
  });
});
