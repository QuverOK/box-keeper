import {
  computeCanvasPad,
  computeTargetFeaturePx,
} from "@/shared/lib/responsive";

export const ZOOM_MIN = 0.5;
export const ZOOM_STEP = 1.2;
export const MIN_FEATURE_CM = 5;
export const MAX_REFERENCE_BOX_CM = 300;
export const TARGET_FEATURE_PX = 120;
export const ZOOM_MAX_FLOOR = 4;
export const ZOOM_MAX_CEILING = 2000;
export const ZOOM_TO_BOX_PADDING = 0.75;
export const ZOOM_SLIDER_MIN = 0;
export const ZOOM_SLIDER_MAX = 100;
export const FULLSCREEN_DEFAULT_ZOOM = 0.8;

export const STORAGE_STRIP_SCROLL_CLASS = "storage-strip-scroll";
export const STORAGE_STAGING_SCROLL_CLASS = "storage-staging-scroll";
export const STORAGE_CANVAS_VIEWPORT_CLASS = "storage-canvas-viewport";
export const STAGING_CARD_SIZE_CLASS = "w-17 h-14 sm:w-28 sm:h-24";
/** Ширина открытой панели: 2 карточки + gap + padding */
export const STAGING_PANEL_TWO_COLS_MAX_W =
  "max-w-[9.625rem] sm:max-w-[16.25rem]";
export const STAGING_SCROLL_WRAPPER_CLASS =
  "overflow-x-auto overscroll-x-contain w-full";

export function computeZoomMax(baseScale: number, viewportW = 800): number {
  if (baseScale <= 0) return ZOOM_MAX_FLOOR;
  const targetPx = computeTargetFeaturePx(viewportW);
  const forMinFeature = targetPx / (MIN_FEATURE_CM * baseScale);
  const forRefBox = computeZoomForBox(
    baseScale,
    MAX_REFERENCE_BOX_CM,
    MAX_REFERENCE_BOX_CM,
    Infinity,
    viewportW,
  );
  return Math.min(
    ZOOM_MAX_CEILING,
    Math.max(ZOOM_MAX_FLOOR, forMinFeature, forRefBox),
  );
}

export function zoomToSliderValue(
  zoom: number,
  zoomMin: number,
  zoomMax: number,
): number {
  if (zoomMin >= zoomMax) return ZOOM_SLIDER_MIN;
  const clamped = Math.min(zoomMax, Math.max(zoomMin, zoom));
  const logMin = Math.log(zoomMin);
  const logMax = Math.log(zoomMax);
  const t = (Math.log(clamped) - logMin) / (logMax - logMin);
  return t * ZOOM_SLIDER_MAX;
}

export function sliderValueToZoom(
  value: number,
  zoomMin: number,
  zoomMax: number,
): number {
  if (zoomMin >= zoomMax) return zoomMin;
  const t =
    Math.min(ZOOM_SLIDER_MAX, Math.max(ZOOM_SLIDER_MIN, value)) /
    ZOOM_SLIDER_MAX;
  const logMin = Math.log(zoomMin);
  const logMax = Math.log(zoomMax);
  return Math.exp(logMin + t * (logMax - logMin));
}

export function computeZoomForBox(
  baseScale: number,
  wCm: number,
  dCm: number,
  zoomMax: number,
  viewportW = 800,
): number {
  if (baseScale <= 0 || wCm <= 0 || dCm <= 0) return 1;
  const targetPx = computeTargetFeaturePx(viewportW);
  const effScale = (targetPx * ZOOM_TO_BOX_PADDING) / Math.max(wCm, dCm);
  const zoom = effScale / baseScale;
  return Math.min(zoomMax, Math.max(ZOOM_MIN, zoom));
}

export const clampZoom = (z: number, zoomMax: number) =>
  Math.min(zoomMax, Math.max(ZOOM_MIN, z));

export function computeBaseScale(
  roomWcm: number,
  roomHcm: number,
  viewportW: number,
  viewportH: number,
): number {
  if (viewportW <= 0 || viewportH <= 0 || roomWcm <= 0 || roomHcm <= 0) {
    return 0;
  }
  return Math.min(viewportW / roomWcm, viewportH / roomHcm);
}

export function computeBaseLayout(
  roomWcm: number,
  roomHcm: number,
  viewportW: number,
  viewportH: number,
) {
  const baseScale = computeBaseScale(roomWcm, roomHcm, viewportW, viewportH);
  const baseCanvasW = Math.floor(roomWcm * baseScale);
  const baseCanvasH = Math.floor(roomHcm * baseScale);
  const pad = computeCanvasPad(viewportW);
  const contentW = baseCanvasW + pad * 2;
  const contentH = baseCanvasH + pad * 2;
  return { baseScale, baseCanvasW, baseCanvasH, pad, contentW, contentH };
}

export function computeScaledLayout(
  baseCanvasW: number,
  baseCanvasH: number,
  pad: number,
  zoom: number,
) {
  const canvasW = baseCanvasW * zoom;
  const canvasH = baseCanvasH * zoom;
  return {
    canvasW,
    canvasH,
    contentW: canvasW + pad * 2,
    contentH: canvasH + pad * 2,
  };
}

export function computeLayoutFocalZoom(params: {
  focalX: number;
  focalY: number;
  positionX: number;
  positionY: number;
  currentZoom: number;
  nextZoom: number;
  baseCanvasW: number;
  baseCanvasH: number;
  pad: number;
  roomWcm: number;
  roomHcm: number;
}): { positionX: number; positionY: number } {
  const {
    focalX,
    focalY,
    positionX,
    positionY,
    currentZoom,
    nextZoom,
    baseCanvasW,
    baseCanvasH,
    pad,
    roomWcm,
    roomHcm,
  } = params;
  if (
    currentZoom <= 0 ||
    nextZoom <= 0 ||
    baseCanvasW <= 0 ||
    baseCanvasH <= 0
  ) {
    return { positionX, positionY };
  }
  const gridX = focalX - positionX - pad;
  const gridY = focalY - positionY - pad;
  const roomCmX = (gridX * roomWcm) / (baseCanvasW * currentZoom);
  const roomCmY = (gridY * roomHcm) / (baseCanvasH * currentZoom);
  const newGridX = (roomCmX * baseCanvasW * nextZoom) / roomWcm;
  const newGridY = (roomCmY * baseCanvasH * nextZoom) / roomHcm;
  return {
    positionX: focalX - pad - newGridX,
    positionY: focalY - pad - newGridY,
  };
}

/** @deprecated CSS-scale focal zoom; prefer computeLayoutFocalZoom for DOM layout zoom */
export function computeTransformForFocalZoom(params: {
  focalX: number;
  focalY: number;
  positionX: number;
  positionY: number;
  currentScale: number;
  nextScale: number;
}): { positionX: number; positionY: number } {
  const { focalX, focalY, positionX, positionY, currentScale, nextScale } =
    params;
  const worldX = (focalX - positionX) / currentScale;
  const worldY = (focalY - positionY) / currentScale;
  return {
    positionX: focalX - worldX * nextScale,
    positionY: focalY - worldY * nextScale,
  };
}

export function computeTransformToBoxCenter(params: {
  xCm: number;
  yCm: number;
  wCm: number;
  dCm: number;
  roomWcm: number;
  roomHcm: number;
  baseCanvasW: number;
  baseCanvasH: number;
  pad: number;
  targetZoom: number;
  viewportW: number;
  viewportH: number;
}): { positionX: number; positionY: number; scale: number } {
  const {
    xCm,
    yCm,
    wCm,
    dCm,
    roomWcm,
    roomHcm,
    baseCanvasW,
    baseCanvasH,
    pad,
    targetZoom,
    viewportW,
    viewportH,
  } = params;
  const boxCx = pad + ((xCm + wCm / 2) / roomWcm) * baseCanvasW * targetZoom;
  const boxCy = pad + ((yCm + dCm / 2) / roomHcm) * baseCanvasH * targetZoom;
  return {
    positionX: viewportW / 2 - boxCx,
    positionY: viewportH / 2 - boxCy,
    scale: targetZoom,
  };
}

export function computeTransformToRoomCenter(params: {
  baseCanvasW: number;
  baseCanvasH: number;
  pad: number;
  targetZoom: number;
  viewportW: number;
  viewportH: number;
}): { positionX: number; positionY: number; scale: number } {
  const { baseCanvasW, baseCanvasH, pad, targetZoom, viewportW, viewportH } =
    params;
  const canvasW = baseCanvasW * targetZoom;
  const canvasH = baseCanvasH * targetZoom;
  const roomCx = pad + canvasW / 2;
  const roomCy = pad + canvasH / 2;
  return {
    positionX: viewportW / 2 - roomCx,
    positionY: viewportH / 2 - roomCy,
    scale: targetZoom,
  };
}
