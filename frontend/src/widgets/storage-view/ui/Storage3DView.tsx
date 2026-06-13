import React, { useState, useEffect, useRef, useMemo, useCallback, } from "react";
import { Box as BoxIcon, Layers, LayoutGrid, Edit, Check, Plus, GripVertical, Inbox, ExternalLink, Package, ZoomIn, ZoomOut, ScanSearch, Maximize2, Minimize2, ChevronUp, ChevronDown, } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { useCanvasViewport, ZOOM_MIN, sliderValueToZoom, FULLSCREEN_DEFAULT_ZOOM, } from "../model/useCanvasViewport";
import { useFullscreen } from "../model/useFullscreen";
import { Slider } from "@/shared/ui/slider";
import { computeFanLayout } from "../model/computeFanLayout";
import { computeCanvasHeightCss } from "@/shared/lib/responsive";
import { useBoxDrag, DraggableBox, BoxDragGhost, computeStacks, boxHighlightCn, getContrastColor, getBorderColor, } from "@/features/box-drag";
import type { PlacedBoxDims, BoxStack, XYZone, PartitionDims, } from "@/features/box-drag";
import { useLayoutDrag, DraggablePartition, DraggableLayoutLabel, LayoutDragGhost, LAYOUT_PARTITION_PREFIX, LAYOUT_LABEL_PREFIX, } from "@/features/layout-drag";
import type { LayoutLabel, Partition } from "@/shared/model";
interface Box {
    id: string;
    name: string;
    x?: number;
    y?: number;
    z?: number;
    itemCount: number;
    color: string;
    sizeW: number;
    sizeD: number;
    sizeH: number;
}
type PlacedBox = Box & {
    x: number;
    y: number;
    z: number;
};
const isPlaced = (box: Box): box is PlacedBox => box.x !== undefined && box.y !== undefined && box.z !== undefined;
type ViewMode = "XY" | "XZ" | "YZ";
interface Storage3DViewProps {
    boxes: Box[];
    onBoxClick: (boxId: string) => void;
    editMode: boolean;
    highlightedBoxId?: string | null;
    searchActive?: boolean;
    matchingBoxIds?: Set<string>;
    gridSize: {
        x: number;
        y: number;
        z: number;
    };
    onMoveBox: (boxId: string, newX?: number, newY?: number, newZ?: number) => void;
    roomSize: {
        width: number;
        depth: number;
        height: number;
    };
    partitions?: Partition[];
    layoutLabels?: LayoutLabel[];
    layoutEditMode?: boolean;
    onMovePartition?: (id: string, x: number, y: number) => void;
    onMoveLayoutLabel?: (id: string, x: number, y: number) => void;
    onToggleEditMode?: () => void;
    onToggleLayoutEditMode?: () => void;
    onAddBox?: () => void;
    isSavingStorage?: boolean;
}
export function Storage3DView({ boxes, onBoxClick, editMode, highlightedBoxId, searchActive = false, matchingBoxIds, gridSize: _gridSize, onMoveBox, roomSize, partitions = [], layoutLabels = [], layoutEditMode = false, onMovePartition, onMoveLayoutLabel, onToggleEditMode, onToggleLayoutEditMode, onAddBox, isSavingStorage = false, }: Storage3DViewProps) {
    void _gridSize;
    const [viewMode] = useState<ViewMode>("XY");
    const [focusedBoxId, setFocusedBoxId] = useState<string | null>(null);
    const { isFullscreen, toggle: toggleFullscreen, containerRef, } = useFullscreen();
    const [expandedStackId, setExpandedStackId] = useState<string | null>(null);
    const [stagingOpen, setStagingOpen] = useState(false);
    const isSearchMatch = (boxId: string): boolean => !!matchingBoxIds && matchingBoxIds.has(boxId);
    const isSearchDimmed = (boxId: string): boolean => searchActive && !isSearchMatch(boxId);
    const getBoxHighlight = (boxId: string, opts: {
        isDragging: boolean;
        isStackExpanded?: boolean;
    }) => boxHighlightCn({
        isDragging: opts.isDragging,
        isSearchMatch: searchActive && isSearchMatch(boxId),
        isSearchHighlight: highlightedBoxId === boxId,
        isFocused: focusedBoxId === boxId && !editMode,
        isStackExpanded: opts.isStackExpanded,
    });
    const roomWcm = roomSize.width * 100;
    const roomHcm = roomSize.depth * 100;
    const roomHeightCm = roomSize.height * 100;
    const dragRoom = {
        widthCm: roomWcm,
        depthCm: roomHcm,
        heightCm: roomHeightCm,
    };
    const placedBoxes = boxes.filter(isPlaced);
    const unplacedBoxes = boxes.filter((b) => !isPlaced(b));
    const placedBoxDims: PlacedBoxDims[] = placedBoxes.map((b) => ({
        id: b.id,
        sizeW: b.sizeW,
        sizeD: b.sizeD,
        sizeH: b.sizeH,
        x: b.x,
        y: b.y,
        z: b.z,
    }));
    const stacks = computeStacks(placedBoxDims);
    const stackInfoByBoxId = new Map<string, {
        stack: BoxStack;
        index: number;
    }>();
    for (const stack of stacks) {
        stack.boxes.forEach((b, index) => stackInfoByBoxId.set(b.id, { stack, index }));
    }
    const expandedStack = stacks.find((s) => s.topBoxId === expandedStackId) ?? null;
    const isAnyExpanded = expandedStack !== null;
    const expandedBoxIds = expandedStack
        ? new Set(expandedStack.boxes.map((b) => b.id))
        : null;
    const sortedPlacedBoxes = [...placedBoxes].sort((a, b) => a.z - b.z);
    const forbiddenZoneRef = useRef<XYZone | null>(null);
    useEffect(() => {
        if (expandedStackId &&
            !stacks.some((s) => s.topBoxId === expandedStackId)) {
            setExpandedStackId(null);
        }
    }, [expandedStackId, stacks]);
    useEffect(() => {
        if (!expandedStackId)
            return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape")
                setExpandedStackId(null);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [expandedStackId]);
    const partitionDims: PartitionDims[] = partitions.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        z: p.z,
        width: p.width,
        depth: p.depth,
        height: p.height,
    }));
    const { draggedBoxId, hoveredBoxId, dragOverCm, isStagingDragOver, gridRef, handleDragStart, handleDragEnd, handleGridDragOver, handleGridDragLeave, handleGridDrop, handleStagingDragOver, handleStagingDragLeave, handleStagingDrop, setHoveredBoxId, } = useBoxDrag({
        boxes: boxes.map((b) => ({
            id: b.id,
            sizeW: b.sizeW,
            sizeD: b.sizeD,
            sizeH: b.sizeH,
            x: b.x,
            y: b.y,
            z: b.z,
        })),
        room: dragRoom,
        callbacks: { onMoveBox },
        forbiddenZoneRef,
        partitions: partitionDims,
    });
    const layoutDragCallbacks = useMemo(() => ({
        onMovePartition: (id: string, x: number, y: number) => {
            onMovePartition?.(id, x, y);
        },
        onMoveLayoutLabel: (id: string, x: number, y: number) => {
            onMoveLayoutLabel?.(id, x, y);
        },
    }), [onMovePartition, onMoveLayoutLabel]);
    const { draggedItem: draggedLayoutItem, dragOverCm: layoutDragOverCm, hoveredItemId: hoveredLayoutItemId, handleDragStart: handleLayoutDragStart, handleDragEnd: handleLayoutDragEnd, handleGridDragOver: handleLayoutGridDragOver, handleGridDragLeave: handleLayoutGridDragLeave, handleGridDrop: handleLayoutGridDrop, setHoveredItemId: setHoveredLayoutItemId, } = useLayoutDrag({
        room: { widthCm: roomWcm, depthCm: roomHcm },
        partitions: partitions.map((p) => ({
            id: p.id,
            width: p.width,
            depth: p.depth,
        })),
        callbacks: layoutDragCallbacks,
        gridRef,
    });
    const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
        if (layoutEditMode)
            handleLayoutGridDragOver(e);
        if (editMode)
            handleGridDragOver(e);
    }, [layoutEditMode, editMode, handleLayoutGridDragOver, handleGridDragOver]);
    const handleCanvasDragLeave = useCallback((e: React.DragEvent) => {
        if (layoutEditMode)
            handleLayoutGridDragLeave(e);
        if (editMode)
            handleGridDragLeave(e);
    }, [layoutEditMode, editMode, handleLayoutGridDragLeave, handleGridDragLeave]);
    const handleCanvasDrop = useCallback((e: React.DragEvent) => {
        const data = e.dataTransfer.getData("text/plain");
        if (data.startsWith(LAYOUT_PARTITION_PREFIX) ||
            data.startsWith(LAYOUT_LABEL_PREFIX)) {
            handleLayoutGridDrop(e);
            return;
        }
        if (editMode)
            handleGridDrop(e);
    }, [editMode, handleLayoutGridDrop, handleGridDrop]);
    const anyLayoutDragActive = draggedLayoutItem !== null;
    const clusterFootprint: XYZone | null = expandedStack
        ? (() => {
            const x = Math.min(...expandedStack.boxes.map((b) => b.x));
            const y = Math.min(...expandedStack.boxes.map((b) => b.y));
            const w = Math.max(...expandedStack.boxes.map((b) => b.x + b.sizeW)) - x;
            const d = Math.max(...expandedStack.boxes.map((b) => b.y + b.sizeD)) - y;
            return { x, y, w, d };
        })()
        : null;
    const draggedInExpandedCluster = !!draggedBoxId && (expandedBoxIds?.has(draggedBoxId) ?? false);
    const activeForbiddenZone: XYZone | null = draggedInExpandedCluster
        ? clusterFootprint
        : null;
    useEffect(() => {
        forbiddenZoneRef.current = activeForbiddenZone;
    }, [activeForbiddenZone]);
    const { viewportRef, setViewportNode, contentRef, measureRef, viewportSize, zoom, zoomMax, zoomSliderValue, setZoom, zoomIn, zoomOut, resetZoom, zoomToBox, effScale, canvasW, canvasH, contentW, contentH, spaceHeld, isPanning, onPointerDown, onPointerMove, onPointerUp, } = useCanvasViewport({ roomWcm, roomHcm, canvasRef: gridRef });
    const refitOnResizeRef = useRef(false);
    const resetZoomTarget = isFullscreen ? FULLSCREEN_DEFAULT_ZOOM : 1;
    useEffect(() => {
        refitOnResizeRef.current = true;
    }, [isFullscreen]);
    useEffect(() => {
        if (!refitOnResizeRef.current)
            return;
        if (viewportSize.w <= 0 || viewportSize.h <= 0)
            return;
        refitOnResizeRef.current = false;
        resetZoom(resetZoomTarget);
        requestAnimationFrame(() => {
            const el = viewportRef.current;
            if (!el)
                return;
            el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
            el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
        });
    }, [viewportSize, resetZoom, resetZoomTarget, viewportRef]);
    const fanLayout = expandedStack
        ? computeFanLayout({
            stack: expandedStack,
            roomWcm,
            roomHcm,
            viewportW: viewportSize.w || 800,
        })
        : new Map<string, {
            leftPct: number;
            topPct: number;
        }>();
    useEffect(() => {
        if (!expandedStackId || !expandedStack || viewportSize.w <= 0)
            return;
        const layout = computeFanLayout({
            stack: expandedStack,
            roomWcm,
            roomHcm,
            viewportW: viewportSize.w,
        });
        let minX = Infinity;
        let minY = Infinity;
        let maxX = 0;
        let maxY = 0;
        for (const b of expandedStack.boxes) {
            const pos = layout.get(b.id);
            if (!pos)
                continue;
            const x = (pos.leftPct / 100) * roomWcm;
            const y = (pos.topPct / 100) * roomHcm;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + b.sizeW);
            maxY = Math.max(maxY, y + b.sizeD);
        }
        if (minX === Infinity)
            return;
        requestAnimationFrame(() => {
            zoomToBox(minX, minY, maxX - minX, maxY - minY);
        });
    }, [
        expandedStackId,
        expandedStack,
        roomWcm,
        roomHcm,
        viewportSize.w,
        zoomToBox,
    ]);
    const handleToggleStack = (stack: BoxStack) => {
        setExpandedStackId(expandedStackId === stack.topBoxId ? null : stack.topBoxId);
    };
    const handleZoomToPlacedBox = (box: PlacedBox) => {
        zoomToBox(box.x, box.y, box.sizeW, box.sizeD);
    };
    const maxPlacedZ = placedBoxes.reduce((m, b) => Math.max(m, b.z), 0);
    const getBoxOpacity = (box: PlacedBox): number => {
        if (!stackInfoByBoxId.has(box.id))
            return 1.0;
        if (maxPlacedZ === 0)
            return 1.0;
        return Math.max(0.3, Math.min(1.0, 0.3 + 0.7 * (box.z / maxPlacedZ)));
    };
    const boxCanvasStyle = (box: Box, xCm: number, yCm: number): React.CSSProperties => ({
        left: `${(xCm / roomWcm) * 100}%`,
        top: `${(yCm / roomHcm) * 100}%`,
        width: `${(box.sizeW / roomWcm) * 100}%`,
        height: `${(box.sizeD / roomHcm) * 100}%`,
    });
    const focusedBox = boxes.find((b) => b.id === focusedBoxId) ?? null;
    const handleCanvasDragStart = (e: React.DragEvent, boxId: string) => {
        handleDragStart(e, boxId, true);
        setFocusedBoxId(boxId);
    };
    const handleStagingCardDragStart = (e: React.DragEvent, boxId: string) => {
        const b = boxes.find((box) => box.id === boxId);
        const offsetPx = b && effScale > 0
            ? { pxX: (b.sizeW * effScale) / 2, pxY: (b.sizeD * effScale) / 2 }
            : undefined;
        handleDragStart(e, boxId, false, offsetPx);
        setFocusedBoxId(boxId);
    };
    const actionButtons = (<>
      {onAddBox && (<Button className="gap-2" onClick={onAddBox}>
          <Plus className="w-4 h-4"/>
          <span className="hidden min-[401px]:inline">Добавить коробку</span>
        </Button>)}
      {onToggleLayoutEditMode && (<Button variant={layoutEditMode ? "default" : "outline"} className="gap-2" onClick={onToggleLayoutEditMode}>
          <LayoutGrid className="w-4 h-4"/>
          <span className="hidden min-[401px]:inline">Планировка</span>
        </Button>)}
      {onToggleEditMode && (<Button variant={editMode ? "default" : "outline"} className="gap-2" onClick={onToggleEditMode} disabled={isSavingStorage}>
          {editMode ? (<Check className="w-4 h-4"/>) : (<Edit className="w-4 h-4"/>)}
          <span className="hidden min-[401px]:inline">
            {isSavingStorage
                ? "Сохранение…"
                : editMode
                    ? "Готово"
                    : "Редактировать"}
          </span>
        </Button>)}
    </>);
    const zoomControls = (<div className="flex items-center gap-1.5">
      <Button variant="outline" size="icon" className="w-8 h-8" onClick={zoomOut} aria-label="Уменьшить">
        <ZoomOut className="w-4 h-4"/>
      </Button>
      <Slider min={0} max={100} step={0.5} value={[zoomSliderValue]} onValueChange={(values: number[]) => setZoom(sliderValueToZoom(values[0], ZOOM_MIN, zoomMax))} aria-label="Масштаб" className="w-20 sm:w-36"/>
      <span className="text-xs text-muted-foreground font-medium tabular-nums min-w-12 text-center select-none">
        {Math.round(zoom * 100)}%
        {zoom >= zoomMax && (<span className="text-[10px] text-muted-foreground/70 ml-0.5">
            макс.
          </span>)}
      </span>
      <Button variant="outline" size="icon" className="w-8 h-8" onClick={zoomIn} aria-label="Увеличить">
        <ZoomIn className="w-4 h-4"/>
      </Button>
      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => resetZoom(resetZoomTarget)} aria-label="Вписать в экран" title="Вписать в экран">
        <ScanSearch className="w-4 h-4"/>
      </Button>
      <Button variant={isFullscreen ? "default" : "outline"} size="icon" className="w-8 h-8" onClick={toggleFullscreen} aria-label={isFullscreen ? "Свернуть" : "На весь экран"} title={isFullscreen ? "Свернуть" : "На весь экран"}>
        {isFullscreen ? (<Minimize2 className="w-4 h-4"/>) : (<Maximize2 className="w-4 h-4"/>)}
      </Button>
    </div>);
    const stagingList = unplacedBoxes.length === 0 ? (<div className={cn("border-2 border-dashed rounded-lg py-6 text-center text-sm transition-colors", editMode && isStagingDragOver
            ? "border-blue-400 dark:border-blue-600 text-blue-500 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40"
            : "border-border text-muted-foreground")}>
        {editMode
            ? "Перетащите сюда коробку с холста, чтобы убрать её"
            : "Все коробки размещены в хранилище"}
      </div>) : (<div className={cn("flex gap-3 p-3 overflow-x-auto pb-1 min-h-[96px] rounded-lg transition-colors", editMode && isStagingDragOver && "bg-blue-50 dark:bg-blue-950/40")}>
        {unplacedBoxes.map((box) => {
            const isDragging = draggedBoxId === box.id;
            const isHovered = hoveredBoxId === box.id;
            const dimmed = isSearchDimmed(box.id);
            return (<div key={box.id} className="flex-shrink-0" draggable={editMode} onDragStart={editMode
                    ? (e) => handleStagingCardDragStart(e, box.id)
                    : undefined} onDragEnd={editMode ? handleDragEnd : undefined}>
              <Card className={cn("w-28 h-24 transition-all relative overflow-hidden select-none border shadow-sm", editMode
                    ? isDragging
                        ? "cursor-grabbing"
                        : "cursor-grab"
                    : "cursor-pointer hover:shadow-md", getBoxHighlight(box.id, { isDragging }), dimmed && !isDragging && "opacity-30")} style={{
                    backgroundColor: box.color,
                    borderColor: getBorderColor(box.color),
                    outline: editMode && isHovered && !isDragging
                        ? `2px solid ${getBorderColor(box.color).replace("0.2", "0.5").replace("0.25", "0.5")}`
                        : undefined,
                }} onMouseEnter={editMode ? () => setHoveredBoxId(box.id) : undefined} onMouseLeave={editMode ? () => setHoveredBoxId(null) : undefined} onClick={() => setFocusedBoxId(box.id)}>
                {editMode && (<div className="absolute top-1 left-1 text-muted-foreground opacity-50">
                    <GripVertical className="w-3 h-3"/>
                  </div>)}
                <div className="p-2 h-full flex flex-col items-center justify-center text-center" style={{ color: getContrastColor(box.color) }}>
                  <BoxIcon className="w-5 h-5 mb-1 flex-shrink-0"/>
                  <p className="text-xs font-medium break-words line-clamp-2 leading-tight">
                    {box.name}
                  </p>
                  <p className="text-xs opacity-70 mt-0.5">
                    {box.itemCount} предм.
                  </p>
                  <p className="text-[10px] opacity-60">
                    {box.sizeW}×{box.sizeD}×{box.sizeH}см
                  </p>
                </div>
              </Card>
            </div>);
        })}
        {editMode && (<div className="flex-shrink-0 w-28 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center px-3">
              Перетащите сюда с холста
            </p>
          </div>)}
      </div>);
    const stagingHeader = (<div className="flex items-center gap-2 mb-3">
      <Inbox className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
      <h3 className="text-sm font-medium text-foreground">
        Не размещённые коробки
      </h3>
      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
        {unplacedBoxes.length}
      </span>
      {editMode && isStagingDragOver && (<span className="ml-auto text-xs text-blue-600 dark:text-blue-300 font-medium">
          Отпустите, чтобы убрать с холста
        </span>)}
    </div>);
    const boxInfoCard = focusedBox && (<Card className="p-4 border transition-all duration-200">
      <div className="flex items-start gap-2 mb-3">
        <div className="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center shadow-sm mt-0.5" style={{ backgroundColor: focusedBox.color }}>
          <BoxIcon className="w-4 h-4 text-muted-foreground"/>
        </div>
        <p className="font-semibold text-foreground text-sm leading-tight flex-1 min-w-0 break-words">
          {focusedBox.name}
        </p>
        <button className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors flex-shrink-0 text-xs leading-none" onClick={() => setFocusedBoxId(null)} aria-label="Закрыть">
          ✕
        </button>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground/70">Размер</span>
          <span className="font-medium text-foreground">
            {focusedBox.sizeW}×{focusedBox.sizeD}×{focusedBox.sizeH} см
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground/70">Предметов</span>
          <span className="font-medium text-foreground flex items-center gap-1">
            <Package className="w-3 h-3"/>
            {focusedBox.itemCount}
          </span>
        </div>
        {isPlaced(focusedBox) ? (<div className="flex justify-between">
            <span className="text-muted-foreground/70">Позиция</span>
            <span className="font-medium text-foreground tabular-nums">
              {Math.round(focusedBox.x)},{Math.round(focusedBox.y)},
              {Math.round(focusedBox.z)}
            </span>
          </div>) : (<div className="text-muted-foreground/70 italic text-center text-[11px]">
            не размещена
          </div>)}
      </div>

      <div className="flex flex-col gap-2">
        {isPlaced(focusedBox) && (<Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => handleZoomToPlacedBox(focusedBox)}>
            <ZoomIn className="w-3.5 h-3.5"/>
            Приблизить
          </Button>)}
        <Button size="sm" className="w-full gap-1.5" onClick={() => {
            onBoxClick(focusedBox.id);
            setFocusedBoxId(null);
        }}>
          <ExternalLink className="w-3.5 h-3.5"/>
          Открыть коробку
        </Button>
      </div>
    </Card>);
    const mobileBoxInfoBar = focusedBox && (<Card className="p-3 flex flex-row justify-between items-center shadow-lg">
      <div className="flex flex-col gap-2">
        <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center shadow-sm" style={{ backgroundColor: focusedBox.color }}>
          <BoxIcon className="w-4 h-4 text-muted-foreground"/>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground text-xs leading-tight truncate">
            {focusedBox.name}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight truncate tabular-nums">
            {focusedBox.sizeW}×{focusedBox.sizeD}×{focusedBox.sizeH} см ·{" "}
            {focusedBox.itemCount} предм.
            {isPlaced(focusedBox)
            ? ` · ${Math.round(focusedBox.x)},${Math.round(focusedBox.y)},${Math.round(focusedBox.z)}`
            : " · не размещена"}
          </p>
        </div>
      </div>
      <div className="flex-col flex items-center justify-center gap-2">
        {isPlaced(focusedBox) && (<Button size="icon" variant="outline" className="w-8 h-8 shrink-0" onClick={() => handleZoomToPlacedBox(focusedBox)} aria-label="Приблизить">
            <ZoomIn className="w-4 h-4"/>
          </Button>)}
        <Button size="icon" className="w-8 h-8 shrink-0" onClick={() => {
            onBoxClick(focusedBox.id);
            setFocusedBoxId(null);
        }} aria-label="Открыть коробку">
          <ExternalLink className="w-4 h-4"/>
        </Button>
        <button className="text-muted-foreground hover:text-foreground p-1 rounded shrink-0 text-xs leading-none" onClick={() => setFocusedBoxId(null)} aria-label="Закрыть">
          ✕
        </button>
      </div>
    </Card>);
    const emptyInfoCard = (<Card className="p-4 flex flex-col items-center justify-center gap-2 text-center min-h-[120px] border-dashed">
      <BoxIcon className="w-6 h-6 text-muted-foreground/40"/>
      <p className="text-xs text-muted-foreground leading-snug">
        {editMode
            ? "Зажмите коробку, чтобы увидеть информацию"
            : "Нажмите на коробку, чтобы увидеть информацию"}
      </p>
    </Card>);
    const canvasRegion = (<div ref={measureRef} className={cn(isFullscreen ? "absolute inset-0" : "relative w-full")} style={isFullscreen
            ? undefined
            : { height: computeCanvasHeightCss(viewportSize.w || 800) }}>
      <div ref={setViewportNode} className={cn("miro-scroll relative h-full w-full overflow-auto bg-muted [touch-action:pan-x_pan-y]", !isFullscreen && "rounded-lg border border-border", spaceHeld && (isPanning ? "cursor-grabbing" : "cursor-grab"), isPanning && "select-none")} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>

        <div ref={contentRef} className="relative" style={{ width: contentW, height: contentH }}>

          <div ref={gridRef} className={cn("absolute bg-card rounded-lg border border-border overflow-visible", spaceHeld && "pointer-events-none")} style={{
            width: canvasW,
            height: canvasH,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
        }} onDragOver={editMode || layoutEditMode ? handleCanvasDragOver : undefined} onDragLeave={editMode || layoutEditMode ? handleCanvasDragLeave : undefined} onDrop={editMode || layoutEditMode ? handleCanvasDrop : undefined} onClick={isAnyExpanded ? () => setExpandedStackId(null) : undefined}>

            {editMode &&
            dragOverCm &&
            draggedBoxId &&
            (() => {
                const draggedBox = boxes.find((b) => b.id === draggedBoxId);
                if (!draggedBox)
                    return null;
                return (<BoxDragGhost draggedBox={{
                        id: draggedBox.id,
                        sizeW: draggedBox.sizeW,
                        sizeD: draggedBox.sizeD,
                        sizeH: draggedBox.sizeH,
                    }} dragOverCm={dragOverCm} placedBoxes={placedBoxDims} room={dragRoom} forbiddenZone={activeForbiddenZone} partitions={partitionDims}/>);
            })()}

            {sortedPlacedBoxes.map((box) => {
            const opacity = getBoxOpacity(box);
            if (opacity === 0)
                return null;
            const isDragging = draggedBoxId === box.id;
            const isHovered = hoveredBoxId === box.id;
            const dimmed = isSearchDimmed(box.id);
            const stackInfo = stackInfoByBoxId.get(box.id);
            const isTopOfStack = stackInfo?.stack.topBoxId === box.id;
            const isInExpandedStack = expandedBoxIds?.has(box.id) ?? false;
            const isThisStackExpanded = stackInfo != null &&
                expandedStackId === stackInfo.stack.topBoxId;
            const recede = isAnyExpanded && !isInExpandedStack;
            const fanPos = isInExpandedStack
                ? fanLayout.get(box.id)
                : undefined;
            const wrapperStyle: React.CSSProperties = fanPos
                ? {
                    left: `${fanPos.leftPct}%`,
                    top: `${fanPos.topPct}%`,
                    width: `${(box.sizeW / roomWcm) * 100}%`,
                    height: `${(box.sizeD / roomHcm) * 100}%`,
                    zIndex: 30 + (stackInfo?.index ?? 0),
                    transition: "left 150ms ease, top 150ms ease",
                }
                : boxCanvasStyle(box, box.x, box.y);
            const baseOpacity = isDragging
                ? 0.4
                : dimmed
                    ? opacity * 0.15
                    : opacity;
            const finalOpacity = isInExpandedStack
                ? 1
                : recede
                    ? baseOpacity * 0.12
                    : baseOpacity;
            return (<div key={box.id} className={cn("absolute", recede && "pointer-events-none")} style={wrapperStyle} onClick={isInExpandedStack ? (e) => e.stopPropagation() : undefined}>
                  <DraggableBox id={box.id} color={box.color} editMode={editMode} isDragging={isDragging} isHovered={isHovered} anyDragActive={draggedBoxId !== null} style={{ opacity: finalOpacity }} className={getBoxHighlight(box.id, {
                    isDragging,
                    isStackExpanded: isInExpandedStack,
                })} draggable={editMode && !spaceHeld} onDragStart={editMode
                    ? (e) => handleCanvasDragStart(e, box.id)
                    : undefined} onDragEnd={editMode ? handleDragEnd : undefined} onMouseEnter={editMode ? () => setHoveredBoxId(box.id) : undefined} onMouseLeave={editMode ? () => setHoveredBoxId(null) : undefined} onClick={() => {
                    if (spaceHeld)
                        return;
                    setFocusedBoxId(box.id);
                    if (!editMode) {
                        handleZoomToPlacedBox(box);
                    }
                }}>
                    {editMode && (<div className="absolute top-0.5 left-0.5 pointer-events-none opacity-50" style={{ color: getContrastColor(box.color) }}>
                        <GripVertical className="w-3 h-3"/>
                      </div>)}
                    {isInExpandedStack && (<div className="absolute inset-0 flex items-center justify-center p-0.5 pointer-events-none">
                        <span className="text-[9px] font-medium text-foreground bg-card/80 rounded px-1 leading-tight text-center line-clamp-2 break-words">
                          {box.name}
                        </span>
                      </div>)}
                  </DraggableBox>

                  {stackInfo && isTopOfStack && !recede && (<button type="button" className={cn("absolute top-1 right-1 z-40 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold leading-none flex items-center justify-center shadow ring-2 ring-card transition-colors", isThisStackExpanded
                        ? "bg-gray-700 text-white hover:bg-gray-800"
                        : "bg-gray-900 text-white hover:bg-gray-700")} title={isThisStackExpanded
                        ? "Свернуть стопку"
                        : `В стопке ${stackInfo.stack.boxes.length} коробки — нажмите, чтобы раскрыть`} onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStack(stackInfo.stack);
                    }}>
                      {isThisStackExpanded
                        ? "✕"
                        : `×${stackInfo.stack.boxes.length}`}
                    </button>)}
                </div>);
        })}

            {layoutEditMode &&
            layoutDragOverCm &&
            draggedLayoutItem &&
            (() => {
                if (draggedLayoutItem.kind === "partition") {
                    const p = partitions.find((part) => part.id === draggedLayoutItem.id);
                    if (!p)
                        return null;
                    return (<LayoutDragGhost kind="partition" width={p.width} depth={p.depth} dragOverCm={layoutDragOverCm} room={{ widthCm: roomWcm, depthCm: roomHcm }}/>);
                }
                const label = layoutLabels.find((l) => l.id === draggedLayoutItem.id);
                if (!label)
                    return null;
                return (<LayoutDragGhost kind="label" text={label.text} width={0} depth={0} dragOverCm={layoutDragOverCm} room={{ widthCm: roomWcm, depthCm: roomHcm }}/>);
            })()}

            {partitions.map((p) => {
            const style: React.CSSProperties = {
                left: `${(p.x / roomWcm) * 100}%`,
                top: `${(p.y / roomHcm) * 100}%`,
                width: `${(p.width / roomWcm) * 100}%`,
                height: `${(p.depth / roomHcm) * 100}%`,
                zIndex: layoutEditMode ? 45 : 15,
            };
            const isDragging = draggedLayoutItem?.kind === "partition" &&
                draggedLayoutItem.id === p.id;
            const isHovered = hoveredLayoutItemId === p.id;
            if (layoutEditMode) {
                return (<DraggablePartition key={p.id} id={p.id} label={p.label} layoutEditMode isDragging={isDragging} isHovered={isHovered} anyDragActive={anyLayoutDragActive} style={style} onDragStart={handleLayoutDragStart} onDragEnd={handleLayoutDragEnd} onMouseEnter={() => setHoveredLayoutItemId(p.id)} onMouseLeave={() => setHoveredLayoutItemId(null)}/>);
            }
            return (<div key={p.id} className="absolute pointer-events-none border-2 border-slate-500/70 bg-slate-400/25 rounded-sm" style={style} title={p.label ?? "Перегородка"}/>);
        })}

            {layoutLabels.map((l) => {
            const style: React.CSSProperties = {
                left: `${(l.x / roomWcm) * 100}%`,
                top: `${(l.y / roomHcm) * 100}%`,
                zIndex: layoutEditMode ? 45 : 15,
            };
            const isDragging = draggedLayoutItem?.kind === "label" &&
                draggedLayoutItem.id === l.id;
            const isHovered = hoveredLayoutItemId === l.id;
            if (layoutEditMode) {
                return (<DraggableLayoutLabel key={l.id} id={l.id} text={l.text} fontSize={l.fontSize} layoutEditMode isDragging={isDragging} isHovered={isHovered} anyDragActive={anyLayoutDragActive} style={style} onDragStart={handleLayoutDragStart} onDragEnd={handleLayoutDragEnd} onMouseEnter={() => setHoveredLayoutItemId(l.id)} onMouseLeave={() => setHoveredLayoutItemId(null)}/>);
            }
            return (<div key={l.id} className="absolute pointer-events-none text-foreground font-medium whitespace-nowrap" style={{ ...style, fontSize: l.fontSize }}>
                  {l.text}
                </div>);
        })}

            {placedBoxes.length === 0 && !dragOverCm && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-muted-foreground/40 select-none">
                  {editMode
                ? "Перетащите коробку из «не размещённых» сюда"
                : "Пусто"}
                </p>
              </div>)}
          </div>
        </div>
      </div>
    </div>);
    const legend = editMode ? (<div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
      <p className="text-sm text-amber-800 dark:text-amber-200 mb-1 font-semibold">
        Режим перестановки:
      </p>
      <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
        <li>• Перетащите коробку из «не размещённых» в любое место холста</li>
        <li>• Перетащите коробку с холста обратно в «не размещённые»</li>
        <li>
          • Синий контур — место свободно; красный — наложение, нельзя поставить
        </li>
        <li>
          • Значок «×N» — стопка из нескольких коробок; нажмите, чтобы раскрыть
          веером и добраться до нижних
        </li>
      </ul>
    </div>) : (<div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg">
      <p className="text-sm text-blue-800 dark:text-blue-200 mb-1 font-semibold">
        Как использовать:
      </p>
      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
        <li>• Нажмите на коробку, чтобы увидеть информацию</li>
        <li>
          • Значок «×N» — стопка коробок; нажмите, чтобы раскрыть веером и
          выбрать нижнюю (Esc или клик по фону — свернуть)
        </li>
        <li>• Нажмите «Редактировать» для свободного перемещения коробок</li>
      </ul>
    </div>);
    if (isFullscreen) {
        return (<div ref={containerRef} className="fixed inset-0 z-50 bg-background overflow-hidden">
        <div className="relative h-full w-full overflow-hidden">
          {canvasRegion}

          {editMode && (<div className="absolute top-3 left-3 z-20 hidden sm:block text-sm text-blue-700 dark:text-blue-200 font-medium bg-card/95 backdrop-blur px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800 shadow">
              Режим редактирования
            </div>)}

          <div className="absolute top-3 right-3 z-20 flex flex-wrap justify-end gap-2 max-w-[calc(100%-1.5rem)]">
            {actionButtons}
            <Button variant="outline" size="icon" className="w-10 h-10 shrink-0" onClick={toggleFullscreen} aria-label="Свернуть" title="Свернуть">
              <Minimize2 className="w-4 h-4"/>
            </Button>
          </div>

          {focusedBox && (<div className="absolute z-20 w-64 right-3 top-16 hidden sm:block">
              {boxInfoCard}
            </div>)}

          {focusedBox && (<div className="absolute z-20 left-3 right-3 bottom-16 sm:hidden">
              {mobileBoxInfoBar}
            </div>)}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-card/95 backdrop-blur border border-border shadow-lg rounded-full px-3 py-1.5">
            {zoomControls}
          </div>

          <div className="absolute z-20 left-3 top-3 sm:top-auto sm:bottom-3 max-w-[calc(100%-1.5rem)]">
            <button type="button" onClick={() => setStagingOpen((v) => !v)} className="flex items-center gap-2 bg-card/95 backdrop-blur border border-border shadow-lg rounded-full px-3 py-1.5 text-sm font-medium">
              <Inbox className="w-4 h-4 text-muted-foreground"/>
              <span className="hidden min-[401px]:inline">Не размещённые</span>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                {unplacedBoxes.length}
              </span>
              {stagingOpen ? (<ChevronDown className="w-4 h-4"/>) : (<ChevronUp className="w-4 h-4"/>)}
            </button>
            {stagingOpen && (<div className={cn("mt-2 bg-card/95 backdrop-blur border border-border shadow-lg rounded-xl p-3 max-w-[80vw] transition-colors", editMode &&
                    isStagingDragOver &&
                    "border-blue-400 dark:border-blue-600")} onDragOver={editMode ? handleStagingDragOver : undefined} onDragLeave={editMode ? handleStagingDragLeave : undefined} onDrop={editMode ? handleStagingDrop : undefined}>
                {stagingList}
              </div>)}
          </div>
        </div>
      </div>);
    }
    return (<div ref={containerRef} className="space-y-4">

      <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 rounded-lg border border-border">
        <div className="flex gap-2">
          <Button variant={viewMode === "XY" ? "default" : "outline"} className="gap-2">
            <Layers className="w-4 h-4"/>
            Сверху
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
        <div className="space-y-4 min-w-0">

          <Card className={cn("p-4 transition-colors duration-150", editMode &&
            isStagingDragOver &&
            "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 border-2")} onDragOver={editMode ? handleStagingDragOver : undefined} onDragLeave={editMode ? handleStagingDragLeave : undefined} onDrop={editMode ? handleStagingDrop : undefined}>
            {stagingHeader}
            {stagingList}
          </Card>

          <Card className="p-4 max-[360px]:p-3">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg">Вид сверху</h3>
                {editMode && (<span className="text-sm text-blue-600 dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                    Режим редактирования
                  </span>)}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline text-xs text-muted-foreground mr-1 select-none">
                  Пробел + перетаскивание — перемещение · Ctrl + колесо —
                  масштаб
                </span>
                {zoomControls}
              </div>
            </div>

            {canvasRegion}

            {legend}
          </Card>
        </div>

        <div className="lg:sticky lg:top-4 h-fit flex flex-col gap-4 w-full lg:w-56">

          {focusedBox ? boxInfoCard : emptyInfoCard}
        </div>
      </div>
    </div>);
}
