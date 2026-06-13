import type { BoxStack } from "./boxPlacement";

export const FAN_GAP_PCT = 1.2;
export const FAN_MAX_VISIBLE_BOXES = 5;
const FAN_MAX_WIDTH_PCT = 95;
export const NARROW_FAN_VIEWPORT = 360;

export interface FanPosition {
  leftPct: number;
  topPct: number;
}

export type FanLayoutMode = "spread" | "scroll";

export interface StackScrollStrip {
  orientation: "horizontal" | "vertical";
  anchorLeftPct: number;
  anchorTopPct: number;
  viewportWidthPct: number;
  viewportHeightPct: number;
  contentWidthPct: number;
  contentHeightPct: number;
  gapPct: number;
}

export interface FanLayoutResult {
  mode: FanLayoutMode;
  layout: Map<string, FanPosition>;
  strip?: StackScrollStrip;
}

export function shouldUseStackScroll(stackSize: number): boolean {
  return stackSize > FAN_MAX_VISIBLE_BOXES;
}

function clampFanPosition(
  leftPct: number,
  topPct: number,
  widthPct: number,
  heightPct: number,
): FanPosition {
  return {
    leftPct: Math.max(0, Math.min(leftPct, 100 - widthPct)),
    topPct: Math.max(0, Math.min(topPct, 100 - heightPct)),
  };
}

function sumWithGaps(values: number[], count: number, gap: number): number {
  if (count <= 0) return 0;
  const slice = values.slice(0, count);
  return slice.reduce((a, b) => a + b, 0) + gap * Math.max(0, count - 1);
}

function computeScrollFanLayout(
  items: BoxStack["boxes"],
  widthsPct: number[],
  heightsPct: number[],
  anchorLeftPct: number,
  anchorTopPct: number,
  viewportW: number,
): FanLayoutResult {
  const layout = new Map<string, FanPosition>();
  const maxWidthPct = Math.max(...widthsPct);
  const maxHeightPct = Math.max(...heightsPct);
  const contentWidthPct =
    widthsPct.reduce((a, b) => a + b, 0) +
    FAN_GAP_PCT * Math.max(0, items.length - 1);
  const contentHeightPct =
    heightsPct.reduce((a, b) => a + b, 0) +
    FAN_GAP_PCT * Math.max(0, items.length - 1);
  const visibleCount = Math.min(FAN_MAX_VISIBLE_BOXES, items.length);
  const useHorizontal = viewportW <= NARROW_FAN_VIEWPORT;

  if (useHorizontal) {
    const viewportWidthPct = sumWithGaps(widthsPct, visibleCount, FAN_GAP_PCT);
    const viewportHeightPct = maxHeightPct;
    let runX = 0;
    items.forEach((b, i) => {
      layout.set(b.id, {
        leftPct: runX,
        topPct: (maxHeightPct - heightsPct[i]) / 2,
      });
      runX += widthsPct[i] + FAN_GAP_PCT;
    });
    return {
      mode: "scroll",
      layout,
      strip: {
        orientation: "horizontal",
        anchorLeftPct,
        anchorTopPct,
        viewportWidthPct,
        viewportHeightPct,
        contentWidthPct,
        contentHeightPct: viewportHeightPct,
        gapPct: FAN_GAP_PCT,
      },
    };
  }

  const viewportWidthPct = maxWidthPct;
  const viewportHeightPct = sumWithGaps(heightsPct, visibleCount, FAN_GAP_PCT);
  let runY = 0;
  items.forEach((b, i) => {
    layout.set(b.id, {
      leftPct: (maxWidthPct - widthsPct[i]) / 2,
      topPct: runY,
    });
    runY += heightsPct[i] + FAN_GAP_PCT;
  });
  return {
    mode: "scroll",
    layout,
    strip: {
      orientation: "vertical",
      anchorLeftPct,
      anchorTopPct,
      viewportWidthPct,
      viewportHeightPct,
      contentWidthPct: viewportWidthPct,
      contentHeightPct,
      gapPct: FAN_GAP_PCT,
    },
  };
}

function computeSpreadFanLayout(
  items: BoxStack["boxes"],
  widthsPct: number[],
  heightsPct: number[],
  anchorLeftPct: number,
  anchorTopPct: number,
  roomWcm: number,
  roomHcm: number,
  viewportW: number,
): FanLayoutResult {
  const layout = new Map<string, FanPosition>();
  const totalWpct =
    widthsPct.reduce((a, b) => a + b, 0) + FAN_GAP_PCT * (items.length - 1);
  const maxHpct = Math.max(...heightsPct);
  const anchor = items[items.length - 1];
  const useVertical =
    viewportW <= NARROW_FAN_VIEWPORT || totalWpct > FAN_MAX_WIDTH_PCT;

  if (!useVertical) {
    const centerXpct = ((anchor.x + anchor.sizeW / 2) / roomWcm) * 100;
    let startX = centerXpct - totalWpct / 2;
    startX = Math.max(0, Math.min(startX, Math.max(0, 100 - totalWpct)));
    let topPct = anchorTopPct;
    topPct = Math.max(0, Math.min(topPct, Math.max(0, 100 - maxHpct)));
    let run = startX;
    items.forEach((b, i) => {
      layout.set(
        b.id,
        clampFanPosition(run, topPct, widthsPct[i], heightsPct[i]),
      );
      run += widthsPct[i] + FAN_GAP_PCT;
    });
    return { mode: "spread", layout };
  }

  const anchorWidthPct = widthsPct[items.length - 1];
  let leftPct = anchorLeftPct + anchorWidthPct / 2;
  const maxWidthPct = Math.max(...widthsPct);
  leftPct = Math.max(maxWidthPct / 2, Math.min(leftPct, 100 - maxWidthPct / 2));
  leftPct -= maxWidthPct / 2;
  const totalHpct =
    heightsPct.reduce((a, b) => a + b, 0) + FAN_GAP_PCT * (items.length - 1);
  let topPct = anchorTopPct;
  topPct = Math.max(0, Math.min(topPct, Math.max(0, 100 - totalHpct)));
  let runY = topPct;
  items.forEach((b, i) => {
    const boxLeft = leftPct + (maxWidthPct - widthsPct[i]) / 2;
    layout.set(
      b.id,
      clampFanPosition(boxLeft, runY, widthsPct[i], heightsPct[i]),
    );
    runY += heightsPct[i] + FAN_GAP_PCT;
  });
  return { mode: "spread", layout };
}

export function computeFanLayout(params: {
  stack: BoxStack;
  roomWcm: number;
  roomHcm: number;
  viewportW: number;
}): FanLayoutResult {
  const { stack, roomWcm, roomHcm, viewportW } = params;
  const items = stack.boxes;
  const layout = new Map<string, FanPosition>();
  if (items.length === 0) {
    return { mode: "spread", layout };
  }

  const widthsPct = items.map((b) => (b.sizeW / roomWcm) * 100);
  const heightsPct = items.map((b) => (b.sizeD / roomHcm) * 100);
  const anchor = items[items.length - 1];
  const anchorLeftPct = (anchor.x / roomWcm) * 100;
  const anchorTopPct = (anchor.y / roomHcm) * 100;

  if (shouldUseStackScroll(items.length)) {
    return computeScrollFanLayout(
      items,
      widthsPct,
      heightsPct,
      anchorLeftPct,
      anchorTopPct,
      viewportW,
    );
  }

  return computeSpreadFanLayout(
    items,
    widthsPct,
    heightsPct,
    anchorLeftPct,
    anchorTopPct,
    roomWcm,
    roomHcm,
    viewportW,
  );
}

export function getFanZoomBoundsCm(
  result: FanLayoutResult,
  stack: BoxStack,
  roomWcm: number,
  roomHcm: number,
): { x: number; y: number; w: number; d: number } | null {
  if (stack.boxes.length === 0) return null;

  if (result.mode === "scroll" && result.strip) {
    const { strip } = result;
    return {
      x: (strip.anchorLeftPct / 100) * roomWcm,
      y: (strip.anchorTopPct / 100) * roomHcm,
      w: (strip.viewportWidthPct / 100) * roomWcm,
      d: (strip.viewportHeightPct / 100) * roomHcm,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;
  for (const b of stack.boxes) {
    const pos = result.layout.get(b.id);
    if (!pos) continue;
    const x = (pos.leftPct / 100) * roomWcm;
    const y = (pos.topPct / 100) * roomHcm;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + b.sizeW);
    maxY = Math.max(maxY, y + b.sizeD);
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, d: maxY - minY };
}
