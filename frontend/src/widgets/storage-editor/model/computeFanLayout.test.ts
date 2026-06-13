import { describe, it, expect } from "vitest";
import {
  computeFanLayout,
  FAN_GAP_PCT,
  FAN_MAX_VISIBLE_BOXES,
  getFanZoomBoundsCm,
} from "./computeFanLayout";
import type { BoxStack } from "./boxPlacement";

const roomWcm = 600;
const roomHcm = 500;

function makeStack(
  boxes: Array<{
    id: string;
    x: number;
    y: number;
    sizeW: number;
    sizeD: number;
    sizeH: number;
    z: number;
  }>,
): BoxStack {
  return {
    boxes: boxes.map((b) => ({
      id: b.id,
      x: b.x,
      y: b.y,
      z: b.z,
      sizeW: b.sizeW,
      sizeD: b.sizeD,
      sizeH: b.sizeH,
    })),
    topBoxId: boxes[boxes.length - 1].id,
  };
}

function makeUniformStack(count: number): BoxStack {
  return makeStack(
    Array.from({ length: count }, (_, i) => ({
      id: `b${i}`,
      x: 200,
      y: 200,
      sizeW: 60,
      sizeD: 40,
      sizeH: 20,
      z: i * 20,
    })),
  );
}

describe("computeFanLayout", () => {
  it("lays boxes horizontally on wide viewport", () => {
    const stack = makeStack([
      { id: "a", x: 100, y: 80, sizeW: 60, sizeD: 40, sizeH: 30, z: 0 },
      { id: "b", x: 100, y: 80, sizeW: 60, sizeD: 40, sizeH: 30, z: 30 },
    ]);
    const result = computeFanLayout({
      stack,
      roomWcm,
      roomHcm,
      viewportW: 800,
    });
    expect(result.mode).toBe("spread");
    const a = result.layout.get("a")!;
    const b = result.layout.get("b")!;
    expect(a.topPct).toBe(b.topPct);
    expect(b.leftPct).toBeGreaterThan(a.leftPct);
  });

  it("uses vertical cascade on narrow viewport (300px)", () => {
    const stack = makeStack([
      { id: "a", x: 100, y: 80, sizeW: 60, sizeD: 40, sizeH: 30, z: 0 },
      { id: "b", x: 100, y: 80, sizeW: 60, sizeD: 40, sizeH: 30, z: 30 },
    ]);
    const result = computeFanLayout({
      stack,
      roomWcm,
      roomHcm,
      viewportW: 300,
    });
    expect(result.mode).toBe("spread");
    const a = result.layout.get("a")!;
    const b = result.layout.get("b")!;
    expect(b.topPct).toBeGreaterThan(a.topPct);
    expect(a.leftPct).toBeCloseTo(b.leftPct, 1);
  });

  it("switches to vertical when total horizontal width exceeds canvas", () => {
    const stack = makeStack([
      { id: "a", x: 50, y: 50, sizeW: 200, sizeD: 80, sizeH: 40, z: 0 },
      { id: "b", x: 50, y: 50, sizeW: 200, sizeD: 80, sizeH: 40, z: 40 },
      { id: "c", x: 50, y: 50, sizeW: 200, sizeD: 80, sizeH: 40, z: 80 },
    ]);
    const result = computeFanLayout({
      stack,
      roomWcm,
      roomHcm,
      viewportW: 800,
    });
    expect(result.mode).toBe("spread");
    const positions = stack.boxes.map((b) => result.layout.get(b.id)!);
    const tops = new Set(positions.map((p) => p.topPct));
    expect(tops.size).toBeGreaterThan(1);
  });

  it("keeps all positions within canvas bounds in spread mode", () => {
    const stack = makeStack([
      { id: "a", x: 500, y: 400, sizeW: 50, sizeD: 50, sizeH: 30, z: 0 },
      { id: "b", x: 500, y: 400, sizeW: 50, sizeD: 50, sizeH: 30, z: 30 },
      { id: "c", x: 500, y: 400, sizeW: 50, sizeD: 50, sizeH: 30, z: 60 },
    ]);
    const result = computeFanLayout({
      stack,
      roomWcm,
      roomHcm,
      viewportW: 300,
    });
    expect(result.mode).toBe("spread");
    for (const box of stack.boxes) {
      const pos = result.layout.get(box.id)!;
      const wPct = (box.sizeW / roomWcm) * 100;
      const hPct = (box.sizeD / roomHcm) * 100;
      expect(pos.leftPct).toBeGreaterThanOrEqual(0);
      expect(pos.topPct).toBeGreaterThanOrEqual(0);
      expect(pos.leftPct + wPct).toBeLessThanOrEqual(100);
      expect(pos.topPct + hPct).toBeLessThanOrEqual(100);
    }
  });

  it("uses scroll mode with vertical strip for large stacks on desktop", () => {
    const stack = makeUniformStack(50);
    const result = computeFanLayout({
      stack,
      roomWcm,
      roomHcm,
      viewportW: 800,
    });
    expect(result.mode).toBe("scroll");
    expect(result.strip?.orientation).toBe("vertical");
    const boxHeightPct = (40 / roomHcm) * 100;
    const expectedViewport =
      boxHeightPct * FAN_MAX_VISIBLE_BOXES +
      FAN_GAP_PCT * (FAN_MAX_VISIBLE_BOXES - 1);
    expect(result.strip?.viewportHeightPct).toBeCloseTo(expectedViewport, 1);
    expect(result.strip!.contentHeightPct).toBeGreaterThan(
      result.strip!.viewportHeightPct,
    );
  });

  it("uses scroll mode with horizontal strip for large stacks on mobile", () => {
    const stack = makeUniformStack(50);
    const result = computeFanLayout({
      stack,
      roomWcm,
      roomHcm,
      viewportW: 300,
    });
    expect(result.mode).toBe("scroll");
    expect(result.strip?.orientation).toBe("horizontal");
    const boxWidthPct = (60 / roomWcm) * 100;
    const expectedViewport =
      boxWidthPct * FAN_MAX_VISIBLE_BOXES +
      FAN_GAP_PCT * (FAN_MAX_VISIBLE_BOXES - 1);
    expect(result.strip?.viewportWidthPct).toBeCloseTo(expectedViewport, 1);
    expect(result.strip!.contentWidthPct).toBeGreaterThan(
      result.strip!.viewportWidthPct,
    );
  });

  it("does not clamp scroll positions to canvas bounds", () => {
    const stack = makeUniformStack(50);
    const result = computeFanLayout({
      stack,
      roomWcm,
      roomHcm,
      viewportW: 800,
    });
    const last = result.layout.get("b49")!;
    expect(last.topPct).toBeGreaterThan(result.strip!.viewportHeightPct);
  });

  it("zoom bounds use viewport size in scroll mode", () => {
    const stack = makeUniformStack(50);
    const result = computeFanLayout({
      stack,
      roomWcm,
      roomHcm,
      viewportW: 800,
    });
    const bounds = getFanZoomBoundsCm(result, stack, roomWcm, roomHcm)!;
    expect(bounds.w).toBeCloseTo(
      (result.strip!.viewportWidthPct / 100) * roomWcm,
    );
    expect(bounds.d).toBeCloseTo(
      (result.strip!.viewportHeightPct / 100) * roomHcm,
    );
  });
});
