export const DRAG_POSITION_THRESHOLD_CM = 0.3;

export const POINTER_DRAG_LONG_PRESS_MS = 200;
export const POINTER_DRAG_MOVE_CANCEL_PX = 8;

export interface GridRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DragGrabOffset {
  pxX: number;
  pxY: number;
}

export function clientPosToCm(
  clientX: number,
  clientY: number,
  rect: GridRect,
  grabOffset: DragGrabOffset,
  room: { widthCm: number; depthCm: number },
): { xCm: number; yCm: number } {
  const topLeftPxX = clientX - rect.left - grabOffset.pxX;
  const topLeftPxY = clientY - rect.top - grabOffset.pxY;
  return {
    xCm: (topLeftPxX / rect.width) * room.widthCm,
    yCm: (topLeftPxY / rect.height) * room.depthCm,
  };
}

export function shouldUpdateDragPosition(
  prev: { xCm: number; yCm: number } | null,
  next: { xCm: number; yCm: number },
  thresholdCm = DRAG_POSITION_THRESHOLD_CM,
): boolean {
  if (!prev) return true;
  return (
    Math.abs(prev.xCm - next.xCm) >= thresholdCm ||
    Math.abs(prev.yCm - next.yCm) >= thresholdCm
  );
}

export function distancePx(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
