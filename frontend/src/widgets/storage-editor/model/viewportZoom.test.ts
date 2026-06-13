import { describe, it, expect } from "vitest";
import {
  computeZoomMax,
  computeZoomForBox,
  computeBaseLayout,
  computeTransformForFocalZoom,
  computeLayoutFocalZoom,
  computeTransformToBoxCenter,
  computeTransformToRoomCenter,
  zoomToSliderValue,
  sliderValueToZoom,
  ZOOM_MIN,
  ZOOM_MAX_FLOOR,
  ZOOM_MAX_CEILING,
  ZOOM_TO_BOX_PADDING,
} from "./viewportZoom";
import {
  computeCanvasPad,
  computeTargetFeaturePx,
} from "@/shared/lib/responsive";

describe("computeZoomMax", () => {
  it("returns at least floor and allows extra zoom on medium warehouses", () => {
    expect(computeZoomMax(1, 800)).toBe(24);
    expect(computeZoomMax(6, 800)).toBe(ZOOM_MAX_FLOOR);
    expect(computeZoomMax(10, 800)).toBe(ZOOM_MAX_FLOOR);
  });
  it("returns floor when baseScale is zero or negative", () => {
    expect(computeZoomMax(0, 800)).toBe(ZOOM_MAX_FLOOR);
    expect(computeZoomMax(-1, 800)).toBe(ZOOM_MAX_FLOOR);
  });
  it("scales up for large warehouses", () => {
    const zoomMax = computeZoomMax(0.01, 800);
    expect(zoomMax).toBeGreaterThan(100);
    expect(zoomMax).toBeLessThanOrEqual(ZOOM_MAX_CEILING);
  });
  it("caps at ceiling for extremely large warehouses", () => {
    const zoomMax = computeZoomMax(0.0001, 800);
    expect(zoomMax).toBe(ZOOM_MAX_CEILING);
  });
  it("scales target feature px down on narrow viewports (300px)", () => {
    const targetPx = computeTargetFeaturePx(300);
    expect(targetPx).toBe(120);
    const zoomMax300 = computeZoomMax(1, 300);
    const zoomMax800 = computeZoomMax(1, 800);
    expect(zoomMax300).toBeLessThanOrEqual(zoomMax800);
  });
  it("uses reduced pad on narrow viewports (268px content width)", () => {
    const pad268 = computeCanvasPad(268);
    expect(pad268).toBeCloseTo(32.16, 0);
    expect(pad268).toBeLessThan(96);
  });
  it("allows full zoom for 300cm box on 500×300 m warehouse", () => {
    const roomWcm = 500 * 100;
    const roomHcm = 300 * 100;
    const viewportW = 800;
    const viewportH = 400;
    const baseScale = Math.min(viewportW / roomWcm, viewportH / roomHcm);
    const zoomMax = computeZoomMax(baseScale, viewportW);
    const boxZoom = computeZoomForBox(baseScale, 300, 300, Infinity, viewportW);
    expect(zoomMax).toBeGreaterThanOrEqual(boxZoom);
    const zoomAtMax = computeZoomForBox(
      baseScale,
      300,
      300,
      zoomMax,
      viewportW,
    );
    const targetPx = computeTargetFeaturePx(viewportW);
    expect(300 * baseScale * zoomAtMax).toBeCloseTo(
      targetPx * ZOOM_TO_BOX_PADDING,
      0,
    );
  });
});

describe("zoom slider log map", () => {
  const zoomMin = ZOOM_MIN;
  const zoomMax = 1800;
  it("maps slider edges to zoomMin and zoomMax", () => {
    expect(sliderValueToZoom(0, zoomMin, zoomMax)).toBeCloseTo(zoomMin, 5);
    expect(sliderValueToZoom(100, zoomMin, zoomMax)).toBeCloseTo(zoomMax, 5);
  });
  it("places default zoom=1 away from slider edges on a wide log range", () => {
    const sliderAt1 = zoomToSliderValue(1, zoomMin, zoomMax);
    expect(sliderAt1).toBeGreaterThan(0);
    expect(sliderAt1).toBeLessThan(50);
  });
  it("is monotonic across slider positions", () => {
    const z25 = sliderValueToZoom(25, zoomMin, zoomMax);
    const z50 = sliderValueToZoom(50, zoomMin, zoomMax);
    const z75 = sliderValueToZoom(75, zoomMin, zoomMax);
    expect(z25).toBeLessThan(z50);
    expect(z50).toBeLessThan(z75);
  });
  it("round-trips zoom through slider value", () => {
    for (const zoom of [0.5, 1, 22.5, 100, 500, 1800]) {
      const slider = zoomToSliderValue(zoom, zoomMin, zoomMax);
      const restored = sliderValueToZoom(slider, zoomMin, zoomMax);
      expect(restored).toBeCloseTo(
        Math.min(zoomMax, Math.max(zoomMin, zoom)),
        5,
      );
    }
  });
});

describe("computeZoomForBox", () => {
  it("returns ~1 for small warehouse and medium box", () => {
    const zoom = computeZoomForBox(1, 60, 60, ZOOM_MAX_FLOOR, 800);
    expect(zoom).toBeLessThanOrEqual(ZOOM_MAX_FLOOR);
    expect(zoom).toBeGreaterThanOrEqual(0.5);
  });
  it("returns high zoom for small box on large warehouse", () => {
    const baseScale = 0.01;
    const viewportW = 800;
    const zoomMax = computeZoomMax(baseScale, viewportW);
    const zoom = computeZoomForBox(baseScale, 30, 30, zoomMax, viewportW);
    expect(zoom).toBeGreaterThan(100);
    const targetPx = computeTargetFeaturePx(viewportW);
    const effScale = baseScale * zoom;
    const boxPx = 30 * effScale;
    expect(boxPx).toBeCloseTo(targetPx * ZOOM_TO_BOX_PADDING, 0);
  });
  it("clamps to zoomMax", () => {
    const zoom = computeZoomForBox(0.001, 1, 1, 50, 800);
    expect(zoom).toBe(50);
  });
  it("uses viewport-scaled target on 268px width", () => {
    const viewportW = 268;
    const baseScale = 0.5;
    const zoomMax = computeZoomMax(baseScale, viewportW);
    const zoom = computeZoomForBox(baseScale, 40, 40, zoomMax, viewportW);
    const targetPx = computeTargetFeaturePx(viewportW);
    const effScale = baseScale * zoom;
    expect(40 * effScale).toBeCloseTo(targetPx * ZOOM_TO_BOX_PADDING, 0);
  });
});

describe("computeBaseLayout", () => {
  it("adds symmetric padding around base canvas", () => {
    const roomWcm = 600;
    const roomHcm = 400;
    const viewportW = 800;
    const viewportH = 500;
    const layout = computeBaseLayout(roomWcm, roomHcm, viewportW, viewportH);
    expect(layout.contentW).toBe(layout.baseCanvasW + layout.pad * 2);
    expect(layout.contentH).toBe(layout.baseCanvasH + layout.pad * 2);
    expect(layout.pad).toBe(computeCanvasPad(viewportW));
  });
});

describe("computeTransformForFocalZoom", () => {
  it("keeps the same world point under focal when zooming in", () => {
    const focalX = 400;
    const focalY = 250;
    const positionX = 50;
    const positionY = 30;
    const currentScale = 1;
    const nextScale = 2;
    const worldX = (focalX - positionX) / currentScale;
    const worldY = (focalY - positionY) / currentScale;
    const { positionX: nextX, positionY: nextY } = computeTransformForFocalZoom(
      {
        focalX,
        focalY,
        positionX,
        positionY,
        currentScale,
        nextScale,
      },
    );
    expect((focalX - nextX) / nextScale).toBeCloseTo(worldX, 5);
    expect((focalY - nextY) / nextScale).toBeCloseTo(worldY, 5);
  });

  it("is symmetric when zooming out", () => {
    const focalX = 200;
    const focalY = 150;
    const start = { positionX: 100, positionY: 60, currentScale: 1 };
    const zoomed = computeTransformForFocalZoom({
      focalX,
      focalY,
      positionX: start.positionX,
      positionY: start.positionY,
      currentScale: 1,
      nextScale: 2,
    });
    const back = computeTransformForFocalZoom({
      focalX,
      focalY,
      positionX: zoomed.positionX,
      positionY: zoomed.positionY,
      currentScale: 2,
      nextScale: 1,
    });
    expect(back.positionX).toBeCloseTo(start.positionX, 0);
    expect(back.positionY).toBeCloseTo(start.positionY, 0);
  });
});

describe("computeLayoutFocalZoom", () => {
  const layoutCtx = {
    baseCanvasW: 400,
    baseCanvasH: 300,
    pad: 48,
    roomWcm: 600,
    roomHcm: 400,
  };

  it("keeps the same room point under focal when zoom changes", () => {
    const focalX = 300;
    const focalY = 200;
    const positionX = 40;
    const positionY = 30;
    const currentZoom = 1;
    const nextZoom = 2;
    const gridX = focalX - positionX - layoutCtx.pad;
    const roomCmX =
      (gridX * layoutCtx.roomWcm) / (layoutCtx.baseCanvasW * currentZoom);
    const { positionX: nextX } = computeLayoutFocalZoom({
      focalX,
      focalY,
      positionX,
      positionY,
      currentZoom,
      nextZoom,
      ...layoutCtx,
    });
    const newGridX =
      (roomCmX * layoutCtx.baseCanvasW * nextZoom) / layoutCtx.roomWcm;
    expect(nextX).toBeCloseTo(focalX - layoutCtx.pad - newGridX, 4);
  });
});

describe("computeTransformToRoomCenter", () => {
  it("centers room canvas in viewport with symmetric margins", () => {
    const roomWcm = 600;
    const roomHcm = 400;
    const viewportW = 800;
    const viewportH = 500;
    const layout = computeBaseLayout(roomWcm, roomHcm, viewportW, viewportH);
    const targetZoom = 1;
    const { positionX, positionY, scale } = computeTransformToRoomCenter({
      baseCanvasW: layout.baseCanvasW,
      baseCanvasH: layout.baseCanvasH,
      pad: layout.pad,
      targetZoom,
      viewportW,
      viewportH,
    });
    const roomCx = layout.pad + (layout.baseCanvasW * targetZoom) / 2;
    expect(scale).toBe(targetZoom);
    expect(roomCx + positionX).toBeCloseTo(viewportW / 2, 0);
    expect(layout.pad + positionX).toBeCloseTo(
      (viewportW - layout.baseCanvasW * targetZoom) / 2,
      0,
    );
    expect(positionY).toBeDefined();
  });
});

describe("computeTransformToBoxCenter", () => {
  it("centers a box in the viewport", () => {
    const roomWcm = 600;
    const roomHcm = 500;
    const viewportW = 800;
    const viewportH = 500;
    const layout = computeBaseLayout(roomWcm, roomHcm, viewportW, viewportH);
    const targetZoom = 4;
    const xCm = 100;
    const yCm = 80;
    const wCm = 60;
    const dCm = 40;
    const { positionX, positionY, scale } = computeTransformToBoxCenter({
      xCm,
      yCm,
      wCm,
      dCm,
      roomWcm,
      roomHcm,
      baseCanvasW: layout.baseCanvasW,
      baseCanvasH: layout.baseCanvasH,
      pad: layout.pad,
      targetZoom,
      viewportW,
      viewportH,
    });
    const boxCx =
      layout.pad +
      ((xCm + wCm / 2) / roomWcm) * layout.baseCanvasW * targetZoom;
    const boxCy =
      layout.pad +
      ((yCm + dCm / 2) / roomHcm) * layout.baseCanvasH * targetZoom;
    expect(scale).toBe(targetZoom);
    expect(boxCx + positionX).toBeCloseTo(viewportW / 2, 0);
    expect(boxCy + positionY).toBeCloseTo(viewportH / 2, 0);
  });
});
