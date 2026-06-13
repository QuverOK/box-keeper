import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/shared/lib/cn";
import {
  ZOOM_MIN,
  ZOOM_STEP,
  clampZoom,
  computeBaseLayout,
  computeLayoutFocalZoom,
  computeScaledLayout,
  computeTransformToBoxCenter,
  computeTransformToRoomCenter,
  computeZoomForBox,
  computeZoomMax,
  STORAGE_CANVAS_VIEWPORT_CLASS,
  zoomToSliderValue,
} from "../model/viewportZoom";
import { useViewportFrame } from "../model/useViewportFrame";
import {
  useViewportGestures,
  type ViewportLayoutContext,
} from "../model/useViewportGestures";

export interface StorageTransformApi {
  zoom: number;
  zoomMax: number;
  zoomSliderValue: number;
  setZoom: (next: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: (target?: number) => void;
  zoomToBox: (xCm: number, yCm: number, wCm: number, dCm: number) => void;
  viewportRef: React.RefObject<HTMLDivElement | null>;
}

export interface StorageTransformViewportProps {
  roomWcm: number;
  roomHcm: number;
  resetZoomTarget: number;
  refitKey: number;
  panningDisabled: boolean;
  pinchDisabled: boolean;
  allowTouchPan: boolean;
  isFullscreen: boolean;
  spaceHeld: boolean;
  isInteracting: boolean;
  className?: string;
  onZoomChange: (api: StorageTransformApi) => void;
  onViewportResize?: (size: { w: number; h: number }) => void;
  onPanningChange: (active: boolean) => void;
  onPinchChange: (active: boolean) => void;
  children: ReactNode;
}

export const StorageTransformViewport = forwardRef<
  StorageTransformApi | null,
  StorageTransformViewportProps
>(function StorageTransformViewport(
  {
    roomWcm,
    roomHcm,
    resetZoomTarget,
    refitKey,
    panningDisabled,
    pinchDisabled,
    allowTouchPan,
    isFullscreen,
    spaceHeld,
    isInteracting,
    className,
    onZoomChange,
    onViewportResize,
    onPanningChange,
    onPinchChange,
    children,
  },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(computeBaseLayout(roomWcm, roomHcm, 800, 600));
  const gestureLayoutRef = useRef<ViewportLayoutContext>({
    baseCanvasW: 0,
    baseCanvasH: 0,
    pad: 0,
    roomWcm,
    roomHcm,
  });
  const spaceHeldRef = useRef(false);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

  spaceHeldRef.current = spaceHeld;

  const baseScale =
    viewportSize.w > 0 && viewportSize.h > 0
      ? computeBaseLayout(roomWcm, roomHcm, viewportSize.w, viewportSize.h)
          .baseScale
      : 0;
  const zoomMax = computeZoomMax(baseScale, viewportSize.w || 800);
  const layout =
    viewportSize.w > 0 && viewportSize.h > 0
      ? computeBaseLayout(roomWcm, roomHcm, viewportSize.w, viewportSize.h)
      : layoutRef.current;

  layoutRef.current = layout;
  gestureLayoutRef.current = {
    baseCanvasW: layout.baseCanvasW,
    baseCanvasH: layout.baseCanvasH,
    pad: layout.pad,
    roomWcm,
    roomHcm,
  };

  const { frame, frameRef, commitFrame, flushFrame } =
    useViewportFrame(zoomMax);

  const scaled = computeScaledLayout(
    layout.baseCanvasW,
    layout.baseCanvasH,
    layout.pad,
    frame.zoom,
  );

  const applyViewport = useCallback(
    (nextZoom: number, x: number, y: number, immediate = false) => {
      commitFrame({ zoom: nextZoom, x, y }, immediate);
    },
    [commitFrame],
  );

  const centerRoomView = useCallback(
    (target = resetZoomTarget) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const scale = clampZoom(target, zoomMax);
      const { positionX, positionY } = computeTransformToRoomCenter({
        baseCanvasW: layout.baseCanvasW,
        baseCanvasH: layout.baseCanvasH,
        pad: layout.pad,
        targetZoom: scale,
        viewportW: viewport.clientWidth,
        viewportH: viewport.clientHeight,
      });
      applyViewport(scale, positionX, positionY, true);
    },
    [
      resetZoomTarget,
      zoomMax,
      layout.baseCanvasW,
      layout.baseCanvasH,
      layout.pad,
      applyViewport,
    ],
  );

  const applyZoomAtCenter = useCallback(
    (nextZoom: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const clamped = clampZoom(nextZoom, zoomMax);
      const current = frameRef.current;
      const { positionX, positionY } = computeLayoutFocalZoom({
        focalX: viewport.clientWidth / 2,
        focalY: viewport.clientHeight / 2,
        positionX: current.x,
        positionY: current.y,
        currentZoom: current.zoom,
        nextZoom: clamped,
        baseCanvasW: layout.baseCanvasW,
        baseCanvasH: layout.baseCanvasH,
        pad: layout.pad,
        roomWcm,
        roomHcm,
      });
      applyViewport(clamped, positionX, positionY, true);
    },
    [
      zoomMax,
      frameRef,
      layout.baseCanvasW,
      layout.baseCanvasH,
      layout.pad,
      roomWcm,
      roomHcm,
      applyViewport,
    ],
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const measure = () => {
      const w = node.clientWidth;
      const h = node.clientHeight;
      setViewportSize((prev) => {
        if (prev.w === w && prev.h === h) return prev;
        onViewportResizeRef.current?.({ w, h });
        return { w, h };
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const blockSafariGesture = (event: Event) => {
      event.preventDefault();
    };
    node.addEventListener("gesturestart", blockSafariGesture, {
      passive: false,
    });
    node.addEventListener("gesturechange", blockSafariGesture, {
      passive: false,
    });
    node.addEventListener("gestureend", blockSafariGesture, {
      passive: false,
    });
    return () => {
      node.removeEventListener("gesturestart", blockSafariGesture);
      node.removeEventListener("gesturechange", blockSafariGesture);
      node.removeEventListener("gestureend", blockSafariGesture);
    };
  }, []);

  const centerRoomViewRef = useRef(centerRoomView);
  centerRoomViewRef.current = centerRoomView;

  useEffect(() => {
    if (refitKey <= 0 || viewportSize.w <= 0) return;
    centerRoomViewRef.current(resetZoomTarget);
  }, [refitKey, resetZoomTarget, viewportSize.w, viewportSize.h]);

  useViewportGestures({
    viewportRef,
    layoutRef: gestureLayoutRef,
    enabled: viewportSize.w > 0 && viewportSize.h > 0,
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
  });

  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const onViewportResizeRef = useRef(onViewportResize);
  onViewportResizeRef.current = onViewportResize;

  const applyZoomAtCenterRef = useRef(applyZoomAtCenter);
  applyZoomAtCenterRef.current = applyZoomAtCenter;
  const applyViewportRef = useRef(applyViewport);
  applyViewportRef.current = applyViewport;

  const apiRef = useRef<StorageTransformApi | null>(null);
  const lastNotifiedMetricsRef = useRef({ zoom: NaN, zoomMax: NaN });

  const zoomSliderValue = zoomToSliderValue(frame.zoom, ZOOM_MIN, zoomMax);
  apiRef.current = {
    zoom: frame.zoom,
    zoomMax,
    zoomSliderValue,
    setZoom: (next) => applyZoomAtCenterRef.current(next),
    zoomIn: () =>
      applyZoomAtCenterRef.current(frameRef.current.zoom * ZOOM_STEP),
    zoomOut: () =>
      applyZoomAtCenterRef.current(frameRef.current.zoom / ZOOM_STEP),
    resetZoom: (target) => centerRoomViewRef.current(target),
    zoomToBox: (xCm, yCm, wCm, dCm) => {
      const viewport = viewportRef.current;
      if (!viewport || baseScale <= 0) return;
      const targetZoom = computeZoomForBox(
        baseScale,
        wCm,
        dCm,
        zoomMax,
        viewport.clientWidth,
      );
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
        viewportW: viewport.clientWidth,
        viewportH: viewport.clientHeight,
      });
      applyViewportRef.current(scale, positionX, positionY, true);
    },
    viewportRef,
  };

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const last = lastNotifiedMetricsRef.current;
    if (last.zoom === api.zoom && last.zoomMax === api.zoomMax) return;
    lastNotifiedMetricsRef.current = { zoom: api.zoom, zoomMax: api.zoomMax };
    onZoomChangeRef.current(api);
  }, [frame.zoom, zoomMax]);

  useImperativeHandle(
    ref,
    () => ({
      ...apiRef.current!,
      zoom: frame.zoom,
      zoomMax,
      zoomSliderValue,
    }),
    [frame.zoom, zoomMax, zoomSliderValue],
  );

  const panningActive = spaceHeld && !panningDisabled;

  return (
    <div
      ref={viewportRef}
      className={cn(
        STORAGE_CANVAS_VIEWPORT_CLASS,
        "relative h-full w-full overflow-hidden bg-muted",
        !isFullscreen && "rounded-lg border border-border",
        spaceHeld && "cursor-grab",
        isInteracting && "is-interacting",
        className,
      )}
    >
      {viewportSize.w > 0 && viewportSize.h > 0 && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="relative"
            style={{
              width: scaled.contentW,
              height: scaled.contentH,
              transform: `translate(${frame.x}px, ${frame.y}px)`,
            }}
          >
            <div
              className={cn(panningActive && "pointer-events-none")}
              style={{
                position: "absolute",
                left: layout.pad,
                top: layout.pad,
                width: scaled.canvasW,
                height: scaled.canvasH,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
