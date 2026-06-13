import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence } from "motion/react";
import { cn } from "@/shared/lib/cn";
import { computeCanvasHeightCss } from "@/shared/lib/responsive";
import { computeFanLayout } from "../model/computeFanLayout";
import {
  StorageTransformViewport,
  type StorageTransformApi,
} from "./StorageTransformViewport";
import { computeBaseLayout } from "../model/viewportZoom";
import { useBoxDrag } from "../model/useBoxDrag";
import {
  useBoxPointerDrag,
  shouldUsePointerBoxDrag,
} from "../model/useBoxPointerDrag";
import {
  useLayoutDrag,
  LAYOUT_PARTITION_PREFIX,
  LAYOUT_LABEL_PREFIX,
} from "../model/useLayoutDrag";
import { computeStacks } from "../model/boxPlacement";
import type {
  PlacedBoxDims,
  BoxStack,
  XYZone,
  PartitionDims,
} from "../model/boxPlacement";
import type { LayoutLabel, Partition } from "@/shared/model";
import { BoxDragGhost } from "./BoxDragGhost";
import { BoxFocusOverlay } from "./BoxFocusOverlay";
import { PlacedBoxLayer } from "./PlacedBoxLayer";
import { ExpandedStackScrollStrip } from "./ExpandedStackScrollStrip";
import { DraggablePartition } from "./DraggablePartition";
import { DraggableLayoutLabel } from "./DraggableLayoutLabel";
import { LayoutDragGhost } from "./LayoutDragGhost";

interface CanvasBox {
  id: string;
  name: string;
  x?: number;
  y?: number;
  z?: number;
  color: string;
  sizeW: number;
  sizeD: number;
  sizeH: number;
}

type PlacedCanvasBox = CanvasBox & { x: number; y: number; z: number };

const isPlaced = (box: CanvasBox): box is PlacedCanvasBox =>
  box.x !== undefined && box.y !== undefined && box.z !== undefined;

const EMPTY_FAN_LAYOUT = new Map<string, { leftPct: number; topPct: number }>();

export interface StorageCanvasDragApi {
  draggedBoxId: string | null;
  hoveredBoxId: string | null;
  isStagingDragOver: boolean;
  isTouchHoldActive: boolean;
  isPointerDragging: boolean;
  touchHoldBoxId: string | null;
  handleStagingDragOver: (e: React.DragEvent) => void;
  handleStagingDragLeave: (e: React.DragEvent) => void;
  handleStagingDrop: (e: React.DragEvent) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  handleStagingCardDragStart: (e: React.DragEvent, boxId: string) => void;
  onBoxPointerDown: ReturnType<typeof useBoxPointerDrag>["onBoxPointerDown"];
  setHoveredBoxId: (id: string | null) => void;
  getStagingOffsetPx: (
    boxId: string,
  ) => { pxX: number; pxY: number } | undefined;
}

export interface StorageCanvasZoomState {
  zoom: number;
  zoomMax: number;
  zoomSliderValue: number;
  setZoom: (next: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: (target?: number) => void;
  zoomToBox: (xCm: number, yCm: number, wCm: number, dCm: number) => void;
}

export interface StorageCanvasProps {
  boxes: CanvasBox[];
  editMode: boolean;
  layoutEditMode: boolean;
  searchActive: boolean;
  matchingBoxIds?: Set<string>;
  highlightedBoxId?: string | null;
  focusedBoxId: string | null;
  expandedStackId: string | null;
  onExpandedStackIdChange: (id: string | null) => void;
  onBoxClick: (
    box: Pick<PlacedCanvasBox, "id" | "x" | "y" | "z" | "sizeW" | "sizeD">,
  ) => void;
  onMoveBox: (
    boxId: string,
    newX?: number,
    newY?: number,
    newZ?: number,
  ) => void;
  roomWcm: number;
  roomHcm: number;
  roomHeightCm: number;
  partitions: Partition[];
  layoutLabels: LayoutLabel[];
  onMovePartition?: (id: string, x: number, y: number) => void;
  onMoveLayoutLabel?: (id: string, x: number, y: number) => void;
  isFullscreen: boolean;
  resetZoomTarget: number;
  dragApiRef: React.MutableRefObject<StorageCanvasDragApi | null>;
  zoomApiRef: React.MutableRefObject<StorageCanvasZoomState | null>;
  onDragMetaChange: (meta: {
    draggedBoxId: string | null;
    hoveredBoxId: string | null;
    isStagingDragOver: boolean;
  }) => void;
  onZoomStateChange: (state: StorageCanvasZoomState) => void;
}

function StorageCanvasInner({
  boxes,
  editMode,
  layoutEditMode,
  searchActive,
  matchingBoxIds,
  highlightedBoxId,
  focusedBoxId,
  expandedStackId,
  onExpandedStackIdChange,
  onBoxClick,
  onMoveBox,
  roomWcm,
  roomHcm,
  roomHeightCm,
  partitions,
  layoutLabels,
  onMovePartition,
  onMoveLayoutLabel,
  isFullscreen,
  resetZoomTarget,
  dragApiRef,
  zoomApiRef,
  onDragMetaChange,
  onZoomStateChange,
}: StorageCanvasProps) {
  const forbiddenZoneRef = useRef<XYZone | null>(null);
  const lastZoomMetricsRef = useRef({
    zoom: NaN,
    zoomMax: NaN,
    zoomSliderValue: NaN,
  });
  const [refitKey, setRefitKey] = useState(1);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const transformApiRef = useRef<StorageTransformApi | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isPinchActive, setIsPinchActive] = useState(false);

  const placedBoxes = useMemo(() => boxes.filter(isPlaced), [boxes]);
  const placedBoxDims: PlacedBoxDims[] = useMemo(
    () =>
      placedBoxes.map((b) => ({
        id: b.id,
        sizeW: b.sizeW,
        sizeD: b.sizeD,
        sizeH: b.sizeH,
        x: b.x,
        y: b.y,
        z: b.z,
      })),
    [placedBoxes],
  );

  const dragRoom = useMemo(
    () => ({
      widthCm: roomWcm,
      depthCm: roomHcm,
      heightCm: roomHeightCm,
    }),
    [roomWcm, roomHcm, roomHeightCm],
  );

  const partitionDims: PartitionDims[] = useMemo(
    () =>
      partitions.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        z: p.z,
        width: p.width,
        depth: p.depth,
        height: p.height,
      })),
    [partitions],
  );

  const dragBoxes = useMemo(
    () =>
      boxes.map((b) => ({
        id: b.id,
        sizeW: b.sizeW,
        sizeD: b.sizeD,
        sizeH: b.sizeH,
        x: b.x,
        y: b.y,
        z: b.z,
      })),
    [boxes],
  );

  const {
    draggedBoxId,
    hoveredBoxId,
    dragOverCm,
    isStagingDragOver,
    gridRef,
    handleDragStart,
    handleDragEnd,
    handleGridDragOver,
    handleGridDragLeave,
    handleGridDrop,
    handleStagingDragOver,
    handleStagingDragLeave,
    handleStagingDrop,
    setHoveredBoxId,
    updateDragOverFromClientPos,
    commitBoxDrop,
    clearDragSession,
    startDragSession,
    dragGrabOffsetRef,
  } = useBoxDrag({
    boxes: dragBoxes,
    room: dragRoom,
    callbacks: { onMoveBox },
    forbiddenZoneRef,
    partitions: partitionDims,
  });

  useEffect(() => {
    setRefitKey((k) => k + 1);
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      setSpaceHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      setSpaceHeld(false);
      setIsPanning(false);
    };
    const reset = () => {
      setSpaceHeld(false);
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

  const handleTransformZoomChange = useCallback(
    (api: StorageTransformApi) => {
      transformApiRef.current = api;
      const zoomState: StorageCanvasZoomState = {
        zoom: api.zoom,
        zoomMax: api.zoomMax,
        zoomSliderValue: api.zoomSliderValue,
        setZoom: api.setZoom,
        zoomIn: api.zoomIn,
        zoomOut: api.zoomOut,
        resetZoom: api.resetZoom,
        zoomToBox: api.zoomToBox,
      };
      zoomApiRef.current = zoomState;

      setZoom((prev) => (prev === api.zoom ? prev : api.zoom));

      const prev = lastZoomMetricsRef.current;
      const metricsChanged =
        prev.zoom !== api.zoom ||
        prev.zoomMax !== api.zoomMax ||
        prev.zoomSliderValue !== api.zoomSliderValue;
      if (!metricsChanged) return;

      lastZoomMetricsRef.current = {
        zoom: api.zoom,
        zoomMax: api.zoomMax,
        zoomSliderValue: api.zoomSliderValue,
      };
      onZoomStateChange(zoomState);
    },
    [onZoomStateChange, zoomApiRef],
  );

  const handleViewportResize = useCallback((size: { w: number; h: number }) => {
    setViewportSize((prev) =>
      prev.w === size.w && prev.h === size.h ? prev : size,
    );
  }, []);

  useEffect(() => {
    setRefitKey((k) => k + 1);
  }, [resetZoomTarget]);

  const effScale = useMemo(() => {
    if (viewportSize.w <= 0 || viewportSize.h <= 0) return 0;
    const { baseScale } = computeBaseLayout(
      roomWcm,
      roomHcm,
      viewportSize.w,
      viewportSize.h,
    );
    return baseScale * zoom;
  }, [roomWcm, roomHcm, viewportSize.w, viewportSize.h, zoom]);

  const [usePointerDrag, setUsePointerDrag] = useState(shouldUsePointerBoxDrag);
  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    const onChange = () => setUsePointerDrag(mql.matches);
    mql.addEventListener("change", onChange);
    setUsePointerDrag(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const pointerDrag = useBoxPointerDrag({
    enabled: usePointerDrag,
    editMode,
    dragState: {
      startDragSession,
      dragGrabOffsetRef,
      updateDragOverFromClientPos,
      commitBoxDrop,
      clearDragSession,
    },
    boxes: dragBoxes,
    onMoveBox,
    partitions: partitionDims,
  });

  const layoutDragCallbacks = useMemo(
    () => ({
      onMovePartition: (id: string, x: number, y: number) => {
        onMovePartition?.(id, x, y);
      },
      onMoveLayoutLabel: (id: string, x: number, y: number) => {
        onMoveLayoutLabel?.(id, x, y);
      },
    }),
    [onMovePartition, onMoveLayoutLabel],
  );

  const {
    draggedItem: draggedLayoutItem,
    dragOverCm: layoutDragOverCm,
    hoveredItemId: hoveredLayoutItemId,
    handleDragStart: handleLayoutDragStart,
    handleDragEnd: handleLayoutDragEnd,
    handleGridDragOver: handleLayoutGridDragOver,
    handleGridDragLeave: handleLayoutGridDragLeave,
    handleGridDrop: handleLayoutGridDrop,
    setHoveredItemId: setHoveredLayoutItemId,
  } = useLayoutDrag({
    room: { widthCm: roomWcm, depthCm: roomHcm },
    partitions: partitions.map((p) => ({
      id: p.id,
      width: p.width,
      depth: p.depth,
    })),
    callbacks: layoutDragCallbacks,
    gridRef,
  });

  const stacks = useMemo(() => computeStacks(placedBoxDims), [placedBoxDims]);
  const stackInfoByBoxId = useMemo(() => {
    const map = new Map<string, { stack: BoxStack; index: number }>();
    for (const stack of stacks) {
      stack.boxes.forEach((b, index) => map.set(b.id, { stack, index }));
    }
    return map;
  }, [stacks]);

  const expandedStack =
    stacks.find((s) => s.topBoxId === expandedStackId) ?? null;
  const isAnyExpanded = expandedStack !== null;
  const expandedBoxIds = useMemo(
    () =>
      expandedStack ? new Set(expandedStack.boxes.map((b) => b.id)) : null,
    [expandedStack],
  );

  const fanLayoutResult = useMemo(
    () =>
      expandedStack
        ? computeFanLayout({
            stack: expandedStack,
            roomWcm,
            roomHcm,
            viewportW: viewportSize.w || 800,
          })
        : null,
    [expandedStack, roomWcm, roomHcm, viewportSize.w],
  );
  const isScrollExpandedStack = fanLayoutResult?.mode === "scroll";
  const fanLayout = fanLayoutResult?.layout ?? EMPTY_FAN_LAYOUT;

  const expandedStackBoxes = useMemo(() => {
    if (!expandedStack) return [];
    const byId = new Map(placedBoxes.map((b) => [b.id, b]));
    return expandedStack.boxes
      .map((b) => byId.get(b.id))
      .filter((b): b is PlacedCanvasBox => b != null);
  }, [expandedStack, placedBoxes]);

  const sortedPlacedBoxes = useMemo(
    () => [...placedBoxes].sort((a, b) => a.z - b.z),
    [placedBoxes],
  );

  const maxPlacedZ = useMemo(
    () => placedBoxes.reduce((m, b) => Math.max(m, b.z), 0),
    [placedBoxes],
  );

  const clusterFootprint: XYZone | null = expandedStack
    ? (() => {
        const x = Math.min(...expandedStack.boxes.map((b) => b.x));
        const y = Math.min(...expandedStack.boxes.map((b) => b.y));
        const w =
          Math.max(...expandedStack.boxes.map((b) => b.x + b.sizeW)) - x;
        const d =
          Math.max(...expandedStack.boxes.map((b) => b.y + b.sizeD)) - y;
        return { x, y, w, d };
      })()
    : null;

  const draggedInExpandedCluster =
    !!draggedBoxId && (expandedBoxIds?.has(draggedBoxId) ?? false);
  const activeForbiddenZone: XYZone | null = draggedInExpandedCluster
    ? clusterFootprint
    : null;

  useEffect(() => {
    forbiddenZoneRef.current = activeForbiddenZone;
  }, [activeForbiddenZone]);

  const draggedBoxDims = useMemo(() => {
    if (!draggedBoxId) return null;
    const box = boxes.find((b) => b.id === draggedBoxId);
    if (!box) return null;
    return {
      id: box.id,
      sizeW: box.sizeW,
      sizeD: box.sizeD,
      sizeH: box.sizeH,
    };
  }, [draggedBoxId, boxes]);

  const focusedPlacedBox = useMemo(() => {
    if (!focusedBoxId || editMode) return null;
    return placedBoxes.find((b) => b.id === focusedBoxId) ?? null;
  }, [focusedBoxId, editMode, placedBoxes]);

  const handleCanvasDragStart = useCallback(
    (e: React.DragEvent, boxId: string) => {
      handleDragStart(e, boxId, true);
    },
    [handleDragStart],
  );

  const handleStagingCardDragStart = useCallback(
    (e: React.DragEvent, boxId: string) => {
      const b = boxes.find((box) => box.id === boxId);
      const offsetPx =
        b && effScale > 0
          ? { pxX: (b.sizeW * effScale) / 2, pxY: (b.sizeD * effScale) / 2 }
          : undefined;
      handleDragStart(e, boxId, false, offsetPx);
    },
    [boxes, effScale, handleDragStart],
  );

  const getStagingOffsetPx = useCallback(
    (boxId: string) => {
      const b = boxes.find((box) => box.id === boxId);
      if (!b || effScale <= 0) return undefined;
      return { pxX: (b.sizeW * effScale) / 2, pxY: (b.sizeD * effScale) / 2 };
    },
    [boxes, effScale],
  );

  const handlePlacedBoxClick = useCallback(
    (
      box: Pick<PlacedCanvasBox, "id" | "x" | "y" | "z" | "sizeW" | "sizeD">,
    ) => {
      if (spaceHeld) return;
      onBoxClick(box);
    },
    [spaceHeld, onBoxClick],
  );

  const handleToggleStack = useCallback(
    (stack: BoxStack) => {
      onExpandedStackIdChange(
        expandedStackId === stack.topBoxId ? null : stack.topBoxId,
      );
    },
    [expandedStackId, onExpandedStackIdChange],
  );

  const handleBoxHoverEnter = useCallback(
    (boxId: string) => setHoveredBoxId(boxId),
    [setHoveredBoxId],
  );
  const handleBoxHoverLeave = useCallback(
    () => setHoveredBoxId(null),
    [setHoveredBoxId],
  );

  const handleCanvasDragOver = useCallback(
    (e: React.DragEvent) => {
      if (layoutEditMode) handleLayoutGridDragOver(e);
      if (editMode) handleGridDragOver(e);
    },
    [layoutEditMode, editMode, handleLayoutGridDragOver, handleGridDragOver],
  );

  const handleCanvasDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (layoutEditMode) handleLayoutGridDragLeave(e);
      if (editMode) handleGridDragLeave(e);
    },
    [layoutEditMode, editMode, handleLayoutGridDragLeave, handleGridDragLeave],
  );

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      const data = e.dataTransfer.getData("text/plain");
      if (
        data.startsWith(LAYOUT_PARTITION_PREFIX) ||
        data.startsWith(LAYOUT_LABEL_PREFIX)
      ) {
        handleLayoutGridDrop(e);
        return;
      }
      if (editMode) handleGridDrop(e);
    },
    [editMode, handleLayoutGridDrop, handleGridDrop],
  );

  const anyLayoutDragActive = draggedLayoutItem !== null;

  const isInteracting =
    isPinchActive || pointerDrag.isPointerDragging || draggedBoxId !== null;

  const blockViewportTouchScroll =
    editMode &&
    usePointerDrag &&
    (pointerDrag.isTouchHoldActive ||
      pointerDrag.isPointerDragging ||
      draggedBoxId !== null);

  useEffect(() => {
    onDragMetaChange({ draggedBoxId, hoveredBoxId, isStagingDragOver });
  }, [draggedBoxId, hoveredBoxId, isStagingDragOver, onDragMetaChange]);

  dragApiRef.current = {
    draggedBoxId,
    hoveredBoxId,
    isStagingDragOver,
    isTouchHoldActive: pointerDrag.isTouchHoldActive,
    isPointerDragging: pointerDrag.isPointerDragging,
    touchHoldBoxId: pointerDrag.touchHoldBoxId,
    handleStagingDragOver,
    handleStagingDragLeave,
    handleStagingDrop,
    handleDragEnd,
    handleStagingCardDragStart,
    onBoxPointerDown: pointerDrag.onBoxPointerDown,
    setHoveredBoxId,
    getStagingOffsetPx,
  };

  return (
    <div
      className={cn(isFullscreen ? "absolute inset-0" : "relative w-full")}
      style={
        isFullscreen
          ? undefined
          : { height: computeCanvasHeightCss(viewportSize.w || 800) }
      }
    >
      <StorageTransformViewport
        roomWcm={roomWcm}
        roomHcm={roomHcm}
        resetZoomTarget={resetZoomTarget}
        refitKey={refitKey}
        panningDisabled={blockViewportTouchScroll}
        pinchDisabled={blockViewportTouchScroll}
        allowTouchPan={usePointerDrag && !editMode}
        isFullscreen={isFullscreen}
        spaceHeld={spaceHeld}
        isInteracting={isInteracting}
        className={cn(
          blockViewportTouchScroll && "touch-none",
          spaceHeld && (isPanning ? "cursor-grabbing" : "cursor-grab"),
          isPanning && "select-none",
        )}
        onZoomChange={handleTransformZoomChange}
        onViewportResize={handleViewportResize}
        onPanningChange={setIsPanning}
        onPinchChange={setIsPinchActive}
      >
        <div
          ref={gridRef}
          className={cn(
            "relative h-full w-full overflow-visible rounded-lg border border-border bg-card storage-grid",
            spaceHeld && "pointer-events-none",
          )}
          onDragOver={
            editMode || layoutEditMode ? handleCanvasDragOver : undefined
          }
          onDragLeave={
            editMode || layoutEditMode ? handleCanvasDragLeave : undefined
          }
          onDrop={editMode || layoutEditMode ? handleCanvasDrop : undefined}
          onClick={
            isAnyExpanded ? () => onExpandedStackIdChange(null) : undefined
          }
        >
          {editMode && draggedBoxId && draggedBoxDims && dragOverCm && (
            <BoxDragGhost
              draggedBox={draggedBoxDims}
              dragOverCm={dragOverCm}
              placedBoxes={placedBoxDims}
              room={dragRoom}
              forbiddenZone={activeForbiddenZone}
              partitions={partitionDims}
              hideStackLabel={usePointerDrag}
            />
          )}

          {focusedPlacedBox && (
            <BoxFocusOverlay
              boxId={focusedPlacedBox.id}
              boxX={focusedPlacedBox.x}
              boxY={focusedPlacedBox.y}
              boxW={focusedPlacedBox.sizeW}
              boxD={focusedPlacedBox.sizeD}
              roomWcm={roomWcm}
              roomHcm={roomHcm}
              visible
            />
          )}

          <AnimatePresence>
            {isScrollExpandedStack &&
              fanLayoutResult?.strip &&
              expandedStack && (
                <ExpandedStackScrollStrip
                  key={expandedStackId ?? ""}
                  stack={expandedStack}
                  strip={fanLayoutResult.strip}
                  layout={fanLayout}
                  boxes={expandedStackBoxes}
                  roomWcm={roomWcm}
                  roomHcm={roomHcm}
                  editMode={editMode}
                  spaceHeld={spaceHeld}
                  usePointerDrag={usePointerDrag}
                  draggedBoxId={draggedBoxId}
                  hoveredBoxId={hoveredBoxId}
                  searchActive={searchActive}
                  matchingBoxIds={matchingBoxIds}
                  highlightedBoxId={highlightedBoxId}
                  stackKey={expandedStackId ?? ""}
                  isInteracting={isInteracting}
                  onBoxClick={(box) => {
                    const full = expandedStackBoxes.find(
                      (b) => b.id === box.id,
                    );
                    if (full) onBoxClick(full);
                  }}
                  onBoxDragStart={handleCanvasDragStart}
                  onDragEnd={handleDragEnd}
                  onBoxHoverEnter={handleBoxHoverEnter}
                  onBoxHoverLeave={handleBoxHoverLeave}
                  onBoxPointerDown={pointerDrag.onBoxPointerDown}
                  onCollapse={() => onExpandedStackIdChange(null)}
                />
              )}
          </AnimatePresence>

          <PlacedBoxLayer
            boxes={sortedPlacedBoxes}
            roomWcm={roomWcm}
            roomHcm={roomHcm}
            editMode={editMode}
            spaceHeld={spaceHeld}
            usePointerDrag={usePointerDrag}
            draggedBoxId={draggedBoxId}
            hoveredBoxId={hoveredBoxId}
            touchHoldBoxId={pointerDrag.touchHoldBoxId}
            highlightedBoxId={highlightedBoxId}
            searchActive={searchActive}
            matchingBoxIds={matchingBoxIds}
            expandedStackId={expandedStackId}
            expandedBoxIds={expandedBoxIds}
            isAnyExpanded={isAnyExpanded}
            isScrollExpandedStack={isScrollExpandedStack}
            isInteracting={isInteracting}
            fanLayout={fanLayout}
            stackInfoByBoxId={stackInfoByBoxId}
            maxPlacedZ={maxPlacedZ}
            onCanvasDragStart={handleCanvasDragStart}
            onDragEnd={handleDragEnd}
            onBoxHoverEnter={handleBoxHoverEnter}
            onBoxHoverLeave={handleBoxHoverLeave}
            onBoxClick={handlePlacedBoxClick}
            onToggleStack={handleToggleStack}
            onBoxPointerDown={pointerDrag.onBoxPointerDown}
          />

          {layoutEditMode &&
            layoutDragOverCm &&
            draggedLayoutItem &&
            (() => {
              if (draggedLayoutItem.kind === "partition") {
                const p = partitions.find(
                  (part) => part.id === draggedLayoutItem.id,
                );
                if (!p) return null;
                return (
                  <LayoutDragGhost
                    kind="partition"
                    width={p.width}
                    depth={p.depth}
                    dragOverCm={layoutDragOverCm}
                    room={{ widthCm: roomWcm, depthCm: roomHcm }}
                  />
                );
              }
              const label = layoutLabels.find(
                (l) => l.id === draggedLayoutItem.id,
              );
              if (!label) return null;
              return (
                <LayoutDragGhost
                  kind="label"
                  text={label.text}
                  width={0}
                  depth={0}
                  dragOverCm={layoutDragOverCm}
                  room={{ widthCm: roomWcm, depthCm: roomHcm }}
                />
              );
            })()}

          {partitions.map((p) => {
            const style: React.CSSProperties = {
              left: `${(p.x / roomWcm) * 100}%`,
              top: `${(p.y / roomHcm) * 100}%`,
              width: `${(p.width / roomWcm) * 100}%`,
              height: `${(p.depth / roomHcm) * 100}%`,
              zIndex: layoutEditMode ? 45 : 15,
            };
            const isDragging =
              draggedLayoutItem?.kind === "partition" &&
              draggedLayoutItem.id === p.id;
            const isHovered = hoveredLayoutItemId === p.id;
            if (layoutEditMode) {
              return (
                <DraggablePartition
                  key={p.id}
                  id={p.id}
                  label={p.label}
                  layoutEditMode
                  isDragging={isDragging}
                  isHovered={isHovered}
                  anyDragActive={anyLayoutDragActive}
                  style={style}
                  onDragStart={handleLayoutDragStart}
                  onDragEnd={handleLayoutDragEnd}
                  onMouseEnter={() => setHoveredLayoutItemId(p.id)}
                  onMouseLeave={() => setHoveredLayoutItemId(null)}
                />
              );
            }
            return (
              <div
                key={p.id}
                className="absolute pointer-events-none border-2 border-slate-500/70 bg-slate-400/25 rounded-sm"
                style={style}
                title={p.label ?? "Перегородка"}
              />
            );
          })}

          {layoutLabels.map((l) => {
            const style: React.CSSProperties = {
              left: `${(l.x / roomWcm) * 100}%`,
              top: `${(l.y / roomHcm) * 100}%`,
              zIndex: layoutEditMode ? 45 : 15,
            };
            const isDragging =
              draggedLayoutItem?.kind === "label" &&
              draggedLayoutItem.id === l.id;
            const isHovered = hoveredLayoutItemId === l.id;
            if (layoutEditMode) {
              return (
                <DraggableLayoutLabel
                  key={l.id}
                  id={l.id}
                  text={l.text}
                  fontSize={l.fontSize}
                  layoutEditMode
                  isDragging={isDragging}
                  isHovered={isHovered}
                  anyDragActive={anyLayoutDragActive}
                  style={style}
                  onDragStart={handleLayoutDragStart}
                  onDragEnd={handleLayoutDragEnd}
                  onMouseEnter={() => setHoveredLayoutItemId(l.id)}
                  onMouseLeave={() => setHoveredLayoutItemId(null)}
                />
              );
            }
            return (
              <div
                key={l.id}
                className="absolute pointer-events-none text-foreground font-medium whitespace-nowrap"
                style={{ ...style, fontSize: l.fontSize }}
              >
                {l.text}
              </div>
            );
          })}

          {placedBoxes.length === 0 && !draggedBoxId && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-muted-foreground/40 select-none">
                {editMode
                  ? "Перетащите коробку из «не размещённых» сюда"
                  : "Пусто"}
              </p>
            </div>
          )}
        </div>
      </StorageTransformViewport>
    </div>
  );
}

export const StorageCanvas = memo(StorageCanvasInner);
