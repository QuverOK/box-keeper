import { useCallback, useEffect, useRef, useState } from "react";
import {
  computeCanvasPad,
  computeTargetFeaturePx,
} from "@/shared/lib/responsive";

export const ZOOM_MIN = 0.5;
export const ZOOM_STEP = 1.2;
export const MIN_FEATURE_CM = 5;
export const MAX_REFERENCE_BOX_CM = 300;
/** Default target feature size at wide viewports; use computeTargetFeaturePx for scaling. */
export const TARGET_FEATURE_PX = 120;
export const ZOOM_MAX_FLOOR = 4;
export const ZOOM_MAX_CEILING = 2000;
export const ZOOM_TO_BOX_PADDING = 0.75;
export const ZOOM_SLIDER_MIN = 0;
export const ZOOM_SLIDER_MAX = 100;
/** Default/reset zoom while in fullscreen — leaves breathing room around the room. */
export const FULLSCREEN_DEFAULT_ZOOM = 0.8;

interface UseCanvasViewportOptions {
  roomWcm: number;
  roomHcm: number;
  /** The white canvas element (sized to canvasW x canvasH); used for the
   *  React-free live preview while pinch-zooming. */
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export interface CanvasViewport {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  setViewportNode: (node: HTMLDivElement | null) => void;
  /** Attach to the content wrapper (sized to contentW x contentH). */
  contentRef: React.RefObject<HTMLDivElement | null>;
  measureRef: (node: HTMLDivElement | null) => void;
  viewportSize: { w: number; h: number };
  zoom: number;
  zoomMax: number;
  zoomSliderValue: number;
  setZoom: (next: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: (target?: number) => void;
  zoomToBox: (xCm: number, yCm: number, wCm: number, dCm: number) => void;
  baseScale: number;
  effScale: number;
  canvasW: number;
  canvasH: number;
  contentW: number;
  contentH: number;
  spaceHeld: boolean;
  isPanning: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

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

const clampZoom = (z: number, zoomMax: number) =>
  Math.min(zoomMax, Math.max(ZOOM_MIN, z));

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
};

function computeLayout(
  roomWcm: number,
  roomHcm: number,
  viewportW: number,
  viewportH: number,
  zoom: number,
) {
  const baseScale =
    viewportW > 0 && viewportH > 0 && roomWcm > 0 && roomHcm > 0
      ? Math.min(viewportW / roomWcm, viewportH / roomHcm)
      : 0;
  const effScale = baseScale * zoom;
  const canvasW = Math.floor(roomWcm * effScale);
  const canvasH = Math.floor(roomHcm * effScale);
  const canvasPad = computeCanvasPad(viewportW);
  const contentW = canvasW > viewportW ? canvasW + canvasPad * 2 : viewportW;
  const contentH = canvasH > viewportH ? canvasH + canvasPad * 2 : viewportH;
  return { baseScale, effScale, canvasW, canvasH, contentW, contentH };
}

export function computeScrollToBoxCenter(params: {
  xCm: number;
  yCm: number;
  wCm: number;
  dCm: number;
  roomWcm: number;
  roomHcm: number;
  viewportW: number;
  viewportH: number;
  zoom: number;
}): { scrollLeft: number; scrollTop: number } {
  const { xCm, yCm, wCm, dCm, roomWcm, roomHcm, viewportW, viewportH, zoom } =
    params;
  const { effScale, canvasW, canvasH, contentW, contentH } = computeLayout(
    roomWcm,
    roomHcm,
    viewportW,
    viewportH,
    zoom,
  );
  const offsetX = (contentW - canvasW) / 2;
  const offsetY = (contentH - canvasH) / 2;
  const boxCx = offsetX + (xCm + wCm / 2) * effScale;
  const boxCy = offsetY + (yCm + dCm / 2) * effScale;
  return {
    scrollLeft: Math.max(0, boxCx - viewportW / 2),
    scrollTop: Math.max(0, boxCy - viewportH / 2),
  };
}

export function useCanvasViewport({
  roomWcm,
  roomHcm,
  canvasRef,
}: UseCanvasViewportOptions): CanvasViewport {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const viewportCleanupRef = useRef<(() => void) | null>(null);

  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoomState] = useState(1);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const panStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });

  // Callback ref so the observer follows the actual mounted node. The canvas
  // node remounts when toggling fullscreen (different JSX trees), so a static
  // useLayoutEffect observer would keep watching the old, detached node and
  // leave viewportSize stale.
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const measure = () => {
      setViewportSize({ w: node.clientWidth, h: node.clientHeight });
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(node);
    observerRef.current = ro;
  }, []);

  const baseScale =
    viewportSize.w > 0 && viewportSize.h > 0 && roomWcm > 0 && roomHcm > 0
      ? Math.min(viewportSize.w / roomWcm, viewportSize.h / roomHcm)
      : 0;
  const zoomMax = computeZoomMax(baseScale, viewportSize.w);
  const zoomMaxRef = useRef(zoomMax);
  zoomMaxRef.current = zoomMax;
  // Mirror current zoom so the (stable) gesture closure can seed live preview.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const effScale = baseScale * zoom;
  const canvasW = Math.floor(roomWcm * effScale);
  const canvasH = Math.floor(roomHcm * effScale);
  const canvasPad = computeCanvasPad(viewportSize.w);
  const contentW =
    canvasW > viewportSize.w ? canvasW + canvasPad * 2 : viewportSize.w;
  const contentH =
    canvasH > viewportSize.h ? canvasH + canvasPad * 2 : viewportSize.h;

  const zoomSliderValue = zoomToSliderValue(zoom, ZOOM_MIN, zoomMax);

  useEffect(() => {
    setZoomState((z) => clampZoom(z, zoomMax));
  }, [zoomMax]);

  const setZoom = useCallback((next: number) => {
    const el = viewportRef.current;
    setZoomState((prevZoom) => {
      const nextZoom = clampZoom(next, zoomMaxRef.current);
      if (nextZoom === prevZoom) return prevZoom;

      if (el && el.clientWidth > 0 && el.clientHeight > 0) {
        const centerX = el.scrollLeft + el.clientWidth / 2;
        const centerY = el.scrollTop + el.clientHeight / 2;
        const ratio = nextZoom / prevZoom;
        requestAnimationFrame(() => {
          el.scrollLeft = centerX * ratio - el.clientWidth / 2;
          el.scrollTop = centerY * ratio - el.clientHeight / 2;
        });
      }
      return nextZoom;
    });
  }, []);

  const zoomIn = useCallback(
    () => setZoomState((z) => clampZoom(z * ZOOM_STEP, zoomMaxRef.current)),
    [],
  );
  const zoomOut = useCallback(
    () => setZoomState((z) => clampZoom(z / ZOOM_STEP, zoomMaxRef.current)),
    [],
  );
  const resetZoom = useCallback(
    (target = 1) => setZoomState(clampZoom(target, zoomMaxRef.current)),
    [],
  );

  const zoomToBox = useCallback(
    (xCm: number, yCm: number, wCm: number, dCm: number) => {
      if (baseScale <= 0 || viewportSize.w <= 0 || viewportSize.h <= 0) return;

      const targetZoom = computeZoomForBox(
        baseScale,
        wCm,
        dCm,
        zoomMaxRef.current,
        viewportSize.w,
      );
      setZoomState(targetZoom);

      requestAnimationFrame(() => {
        const el = viewportRef.current;
        if (!el) return;
        const { scrollLeft, scrollTop } = computeScrollToBoxCenter({
          xCm,
          yCm,
          wCm,
          dCm,
          roomWcm,
          roomHcm,
          viewportW: viewportSize.w,
          viewportH: viewportSize.h,
          zoom: targetZoom,
        });
        el.scrollLeft = scrollLeft;
        el.scrollTop = scrollTop;
      });
    },
    [baseScale, roomWcm, roomHcm, viewportSize.w, viewportSize.h],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      if (e.repeat) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) {
        active.blur();
      }
      setSpaceHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      setSpaceHeld(false);
      panStateRef.current.active = false;
      setIsPanning(false);
    };
    const reset = () => {
      setSpaceHeld(false);
      panStateRef.current.active = false;
      setIsPanning(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", reset);
    };
  }, []);

  // Callback ref so the zoom listeners (Ctrl/Cmd + wheel, two-finger pinch)
  // follow the actual mounted node. The viewport node remounts when toggling
  // fullscreen (different JSX trees), so static useEffect listeners would stay
  // bound to the old, detached node and zoom would silently stop working.
  const setViewportNode = useCallback((node: HTMLDivElement | null) => {
    viewportCleanupRef.current?.();
    viewportCleanupRef.current = null;
    viewportRef.current = node;
    if (!node) return;

    // Zoom around a viewport-relative focal point, keeping it visually fixed.
    const zoomAround = (focalX: number, focalY: number, factor: number) => {
      const pointerX = focalX + node.scrollLeft;
      const pointerY = focalY + node.scrollTop;
      setZoomState((prevZoom) => {
        const nextZoom = clampZoom(prevZoom * factor, zoomMaxRef.current);
        if (nextZoom === prevZoom) return prevZoom;
        const ratio = nextZoom / prevZoom;
        requestAnimationFrame(() => {
          node.scrollLeft = pointerX * ratio - focalX;
          node.scrollTop = pointerY * ratio - focalY;
        });
        return nextZoom;
      });
    };

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      zoomAround(
        e.clientX - rect.left,
        e.clientY - rect.top,
        Math.exp(-e.deltaY * 0.0015),
      );
    };

    const touchDistance = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );

    // Two-finger pinch: preview the zoom by writing the canvas + content-wrapper
    // sizes and scroll straight to the DOM (no React render — the boxes are
    // percentage-based, so they rescale natively). The real zoom is committed
    // to state once, when the gesture ends, to avoid per-frame reconciliation.
    let pinchActive = false;
    let pinchPrevDist = 0;
    let liveZoom = 1;
    let appliedZoom = 1;
    let focalX = 0;
    let focalY = 0;
    let rafId = 0;

    const applyPreview = () => {
      rafId = 0;
      const vw = node.clientWidth;
      const vh = node.clientHeight;
      const ratio = appliedZoom > 0 ? liveZoom / appliedZoom : 1;
      const pointerX = focalX + node.scrollLeft;
      const pointerY = focalY + node.scrollTop;

      const { canvasW, canvasH, contentW, contentH } = computeLayout(
        roomWcm,
        roomHcm,
        vw,
        vh,
        liveZoom,
      );
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.width = `${canvasW}px`;
        canvas.style.height = `${canvasH}px`;
      }
      const content = contentRef.current;
      if (content) {
        content.style.width = `${contentW}px`;
        content.style.height = `${contentH}px`;
      }
      node.scrollLeft = pointerX * ratio - focalX;
      node.scrollTop = pointerY * ratio - focalY;
      appliedZoom = liveZoom;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      pinchActive = true;
      pinchPrevDist = touchDistance(e.touches);
      liveZoom = zoomRef.current;
      appliedZoom = zoomRef.current;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const distance = touchDistance(e.touches);
      if (pinchActive && pinchPrevDist > 0) {
        const rect = node.getBoundingClientRect();
        focalX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        focalY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        liveZoom = clampZoom(
          liveZoom * (distance / pinchPrevDist),
          zoomMaxRef.current,
        );
        if (!rafId) rafId = requestAnimationFrame(applyPreview);
      }
      pinchPrevDist = distance;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length >= 2) return;
      pinchPrevDist = 0;
      if (!pinchActive) return;
      pinchActive = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      // Flush the final frame so the DOM matches the value we commit, then
      // commit once — sizes are unchanged by the render, so there is no jump.
      applyPreview();
      setZoomState(clampZoom(liveZoom, zoomMaxRef.current));
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    node.addEventListener("touchstart", handleTouchStart, { passive: false });
    node.addEventListener("touchmove", handleTouchMove, { passive: false });
    node.addEventListener("touchend", handleTouchEnd);
    node.addEventListener("touchcancel", handleTouchEnd);

    viewportCleanupRef.current = () => {
      if (rafId) cancelAnimationFrame(rafId);
      node.removeEventListener("wheel", handleWheel);
      node.removeEventListener("touchstart", handleTouchStart);
      node.removeEventListener("touchmove", handleTouchMove);
      node.removeEventListener("touchend", handleTouchEnd);
      node.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!spaceHeld) return;
      const el = viewportRef.current;
      if (!el) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      panStateRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startScrollLeft: el.scrollLeft,
        startScrollTop: el.scrollTop,
      };
      setIsPanning(true);
    },
    [spaceHeld],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const pan = panStateRef.current;
    if (!pan.active) return;
    const el = viewportRef.current;
    if (!el) return;
    el.scrollLeft = pan.startScrollLeft - (e.clientX - pan.startX);
    el.scrollTop = pan.startScrollTop - (e.clientY - pan.startY);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!panStateRef.current.active) return;
    const el = viewportRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    panStateRef.current.active = false;
    setIsPanning(false);
  }, []);

  return {
    viewportRef,
    setViewportNode,
    contentRef,
    measureRef,
    viewportSize,
    zoom,
    zoomMax,
    zoomSliderValue,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToBox,
    baseScale,
    effScale,
    canvasW,
    canvasH,
    contentW,
    contentH,
    spaceHeld,
    isPanning,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
