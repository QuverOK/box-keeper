import { useCallback, useEffect, useRef, type RefObject } from "react";
import { clampZoom, computeLayoutFocalZoom } from "./viewportZoom";
import type { ViewportFrame } from "./useViewportFrame";

const WHEEL_ZOOM_SENSITIVITY = 0.0012;

export interface ViewportLayoutContext {
  baseCanvasW: number;
  baseCanvasH: number;
  pad: number;
  roomWcm: number;
  roomHcm: number;
}

interface UseViewportGesturesOptions {
  viewportRef: RefObject<HTMLDivElement | null>;
  layoutRef: RefObject<ViewportLayoutContext>;
  enabled: boolean;
  zoomMax: number;
  spaceHeldRef: RefObject<boolean>;
  panningDisabled: boolean;
  pinchDisabled: boolean;
  allowTouchPan: boolean;
  frameRef: RefObject<ViewportFrame>;
  applyViewport: (
    zoom: number,
    x: number,
    y: number,
    immediate?: boolean,
  ) => void;
  flushFrame: () => void;
  onPanningChange: (active: boolean) => void;
  onPinchChange: (active: boolean) => void;
}

function touchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function touchMidpoint(
  touches: TouchList,
  viewport: DOMRect,
): { x: number; y: number } {
  const x = (touches[0].clientX + touches[1].clientX) / 2 - viewport.left;
  const y = (touches[0].clientY + touches[1].clientY) / 2 - viewport.top;
  return { x, y };
}

function isStorageStripTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(".storage-strip-scroll");
}

export function useViewportGestures({
  viewportRef,
  layoutRef,
  enabled,
  zoomMax,
  spaceHeldRef,
  panningDisabled,
  pinchDisabled,
  allowTouchPan,
  frameRef,
  applyViewport,
  flushFrame,
  onPanningChange,
  onPinchChange,
}: UseViewportGesturesOptions) {
  const mousePanRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const touchPanRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchRef = useRef<{
    startDistance: number;
    startZoom: number;
  } | null>(null);
  const wheelIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zoomAtFocal = useCallback(
    (focalX: number, focalY: number, nextZoom: number) => {
      const layout = layoutRef.current;
      if (!layout) return;
      const current = frameRef.current ?? { zoom: 1, x: 0, y: 0 };
      const clamped = clampZoom(nextZoom, zoomMax);
      const { positionX, positionY } = computeLayoutFocalZoom({
        focalX,
        focalY,
        positionX: current.x,
        positionY: current.y,
        currentZoom: current.zoom,
        nextZoom: clamped,
        baseCanvasW: layout.baseCanvasW,
        baseCanvasH: layout.baseCanvasH,
        pad: layout.pad,
        roomWcm: layout.roomWcm,
        roomHcm: layout.roomHcm,
      });
      applyViewport(clamped, positionX, positionY, false);
    },
    [applyViewport, frameRef, layoutRef, zoomMax],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !enabled) return;

    const canPan = () =>
      !panningDisabled && (allowTouchPan || spaceHeldRef.current);

    const scheduleWheelFlush = () => {
      if (wheelIdleRef.current) clearTimeout(wheelIdleRef.current);
      wheelIdleRef.current = setTimeout(() => {
        wheelIdleRef.current = null;
        flushFrame();
      }, 120);
    };

    const onWheel = (event: WheelEvent) => {
      const isZoomWheel = event.ctrlKey || event.metaKey;
      if (isStorageStripTarget(event.target) && !isZoomWheel) return;
      if (!isZoomWheel) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = viewport.getBoundingClientRect();
      const focalX = event.clientX - rect.left;
      const focalY = event.clientY - rect.top;
      const current = frameRef.current ?? { zoom: 1, x: 0, y: 0 };
      const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
      zoomAtFocal(focalX, focalY, current.zoom * factor);
      scheduleWheelFlush();
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (!spaceHeldRef.current || panningDisabled) return;
      if (isStorageStripTarget(event.target)) return;
      if (!viewport.contains(event.target as Node)) return;
      event.preventDefault();
      const current = frameRef.current ?? { zoom: 1, x: 0, y: 0 };
      mousePanRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: current.x,
        originY: current.y,
      };
      onPanningChange(true);
    };

    const onMouseMove = (event: MouseEvent) => {
      const pan = mousePanRef.current;
      if (!pan) return;
      event.preventDefault();
      const dx = event.clientX - pan.startX;
      const dy = event.clientY - pan.startY;
      const current = frameRef.current ?? { zoom: 1, x: 0, y: 0 };
      applyViewport(current.zoom, pan.originX + dx, pan.originY + dy, false);
    };

    const endMousePan = () => {
      if (!mousePanRef.current) return;
      mousePanRef.current = null;
      onPanningChange(false);
      flushFrame();
    };

    const onTouchStart = (event: TouchEvent) => {
      if (isStorageStripTarget(event.target)) return;
      if (!viewport.contains(event.target as Node)) return;

      if (event.touches.length >= 2 && !pinchDisabled) {
        touchPanRef.current = null;
        const current = frameRef.current ?? { zoom: 1, x: 0, y: 0 };
        pinchRef.current = {
          startDistance: touchDistance(event.touches),
          startZoom: current.zoom,
        };
        onPinchChange(true);
        return;
      }

      if (event.touches.length === 1 && canPan()) {
        pinchRef.current = null;
        const current = frameRef.current ?? { zoom: 1, x: 0, y: 0 };
        touchPanRef.current = {
          startX: event.touches[0].clientX,
          startY: event.touches[0].clientY,
          originX: current.x,
          originY: current.y,
        };
        onPanningChange(true);
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (pinchRef.current && event.touches.length >= 2 && !pinchDisabled) {
        event.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const mid = touchMidpoint(event.touches, rect);
        const distance = touchDistance(event.touches);
        const pinch = pinchRef.current;
        if (pinch.startDistance <= 0) return;
        const nextZoom = pinch.startZoom * (distance / pinch.startDistance);
        zoomAtFocal(mid.x, mid.y, nextZoom);
        return;
      }

      const pan = touchPanRef.current;
      if (!pan || event.touches.length !== 1 || !canPan()) return;
      event.preventDefault();
      const dx = event.touches[0].clientX - pan.startX;
      const dy = event.touches[0].clientY - pan.startY;
      const current = frameRef.current ?? { zoom: 1, x: 0, y: 0 };
      applyViewport(current.zoom, pan.originX + dx, pan.originY + dy, false);
    };

    const onTouchEnd = () => {
      if (pinchRef.current) {
        pinchRef.current = null;
        onPinchChange(false);
        flushFrame();
      }
      if (touchPanRef.current) {
        touchPanRef.current = null;
        onPanningChange(false);
        flushFrame();
      }
    };

    viewport.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", endMousePan);
    window.addEventListener("blur", endMousePan);
    viewport.addEventListener("touchstart", onTouchStart, { passive: false });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd);
    viewport.addEventListener("touchcancel", onTouchEnd);

    return () => {
      if (wheelIdleRef.current) clearTimeout(wheelIdleRef.current);
      viewport.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", endMousePan);
      window.removeEventListener("blur", endMousePan);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [
    viewportRef,
    enabled,
    zoomMax,
    spaceHeldRef,
    panningDisabled,
    pinchDisabled,
    allowTouchPan,
    frameRef,
    applyViewport,
    flushFrame,
    zoomAtFocal,
    onPanningChange,
    onPinchChange,
  ]);
}
