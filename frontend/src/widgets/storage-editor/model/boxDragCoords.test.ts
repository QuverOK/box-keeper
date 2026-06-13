import { describe, it, expect } from "vitest";
import {
  clientPosToCm,
  shouldUpdateDragPosition,
  distancePx,
  DRAG_POSITION_THRESHOLD_CM,
  POINTER_DRAG_MOVE_CANCEL_PX,
} from "./boxDragCoords";

describe("boxDragCoords", () => {
  const room = { widthCm: 600, depthCm: 400 };
  const rect = { left: 100, top: 50, width: 300, height: 200 };
  const grabOffset = { pxX: 10, pxY: 5 };

  it("converts client position to cm using grid rect", () => {
    const result = clientPosToCm(160, 105, rect, grabOffset, room);
    expect(result.xCm).toBeCloseTo(100);
    expect(result.yCm).toBeCloseTo(100);
  });

  it("accounts for grab offset in cm conversion", () => {
    const withOffset = clientPosToCm(160, 105, rect, grabOffset, room);
    const withoutOffset = clientPosToCm(
      150,
      100,
      rect,
      { pxX: 0, pxY: 0 },
      room,
    );
    expect(withOffset.xCm).toBeCloseTo(withoutOffset.xCm);
    expect(withOffset.yCm).toBeCloseTo(withoutOffset.yCm);
  });

  it("skips drag position update below threshold", () => {
    const prev = { xCm: 10, yCm: 20 };
    expect(shouldUpdateDragPosition(prev, { xCm: 10.1, yCm: 20.1 })).toBe(
      false,
    );
    expect(
      shouldUpdateDragPosition(prev, {
        xCm: 10 + DRAG_POSITION_THRESHOLD_CM,
        yCm: 20,
      }),
    ).toBe(true);
  });

  it("always updates when there is no previous position", () => {
    expect(shouldUpdateDragPosition(null, { xCm: 1, yCm: 1 })).toBe(true);
  });

  it("measures pointer movement distance in px", () => {
    expect(distancePx(0, 0, 3, 4)).toBe(5);
    expect(distancePx(10, 10, 10, 10 + POINTER_DRAG_MOVE_CANCEL_PX + 1)).toBe(
      POINTER_DRAG_MOVE_CANCEL_PX + 1,
    );
  });
});
