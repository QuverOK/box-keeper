import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Box as BoxIcon,
  Layers,
  LayoutGrid,
  Edit,
  Check,
  Plus,
  GripVertical,
  Inbox,
  ExternalLink,
  Package,
  ZoomIn,
  ZoomOut,
  ScanSearch,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import {
  ZOOM_MIN,
  sliderValueToZoom,
  FULLSCREEN_DEFAULT_ZOOM,
  STORAGE_STAGING_SCROLL_CLASS,
  STAGING_CARD_SIZE_CLASS,
  STAGING_PANEL_TWO_COLS_MAX_W,
  STAGING_SCROLL_WRAPPER_CLASS,
} from "../model/viewportZoom";
import { useFullscreen } from "../model/useFullscreen";
import { Slider } from "@/shared/ui/slider";
import {
  StorageCanvas,
  type StorageCanvasDragApi,
  type StorageCanvasLayoutDragApi,
  type StorageCanvasZoomState,
} from "./StorageCanvas";
import {
  LayoutEditControls,
  type PendingTemplateDrop,
} from "./LayoutEditControls";
import type { LayoutDragItem } from "../model/useLayoutDrag";
import { PanelDragHint } from "./PanelDragHint";
import { computeStacks } from "../model/boxPlacement";
import { boxHighlightCn } from "../lib/box-highlight";
import { getContrastColor, getBorderColor } from "../lib/boxColor";
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
const isPlaced = (box: Box): box is PlacedBox =>
  box.x !== undefined && box.y !== undefined && box.z !== undefined;
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
  onMoveBox: (
    boxId: string,
    newX?: number,
    newY?: number,
    newZ?: number,
  ) => void;
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
  onCreatePartition?: (data: {
    x: number;
    y: number;
    z: number;
    width: number;
    depth: number;
    height: number;
    label?: string;
  }) => Promise<void>;
  onDeletePartition?: (id: string) => Promise<void>;
  onUpdatePartition?: (
    id: string,
    data: {
      x: number;
      y: number;
      z: number;
      width: number;
      depth: number;
      height: number;
      label?: string;
    },
  ) => Promise<void>;
  onCreateLayoutLabel?: (data: {
    x: number;
    y: number;
    text: string;
  }) => Promise<void>;
  onDeleteLayoutLabel?: (id: string) => Promise<void>;
  onUpdateLayoutLabel?: (
    id: string,
    data: {
      x: number;
      y: number;
      text: string;
    },
  ) => Promise<void>;
  onToggleEditMode?: () => void;
  onToggleLayoutEditMode?: () => void;
  onAddBox?: () => void;
  isSavingStorage?: boolean;
  onDialogPortalHostChange?: (host: HTMLDivElement | null) => void;
  onFullscreenControlChange?: (
    control: { toggle: () => void; isFullscreen: boolean } | null,
  ) => void;
  layoutDragApiRef: React.MutableRefObject<StorageCanvasLayoutDragApi | null>;
  onLayoutDragMetaChange: (meta: {
    draggedLayoutItem: LayoutDragItem | null;
    touchHoldTemplate: string | null;
    isTouchHoldActive: boolean;
    isPointerDragging: boolean;
  }) => void;
  onTemplatePlaced: (data: PendingTemplateDrop) => void;
  pendingTemplateDrop: PendingTemplateDrop | null;
  onPendingTemplateDropHandled: () => void;
  usePointerDrag: boolean;
  layoutDragApi: StorageCanvasLayoutDragApi | null;
}
export function Storage3DView({
  boxes,
  onBoxClick,
  editMode,
  highlightedBoxId,
  searchActive = false,
  matchingBoxIds,
  gridSize: _gridSize,
  onMoveBox,
  roomSize,
  partitions = [],
  layoutLabels = [],
  layoutEditMode = false,
  onMovePartition,
  onMoveLayoutLabel,
  onCreatePartition,
  onDeletePartition,
  onUpdatePartition,
  onCreateLayoutLabel,
  onDeleteLayoutLabel,
  onUpdateLayoutLabel,
  onToggleEditMode,
  onToggleLayoutEditMode,
  onAddBox,
  isSavingStorage = false,
  onDialogPortalHostChange,
  onFullscreenControlChange,
  layoutDragApiRef,
  onLayoutDragMetaChange,
  onTemplatePlaced,
  pendingTemplateDrop,
  onPendingTemplateDropHandled,
  usePointerDrag,
  layoutDragApi,
}: Storage3DViewProps) {
  void _gridSize;
  const [viewMode] = useState<ViewMode>("XY");
  const [focusedBoxId, setFocusedBoxId] = useState<string | null>(null);
  const {
    isFullscreen,
    toggle: toggleFullscreen,
    containerRef,
  } = useFullscreen();
  const [expandedStackId, setExpandedStackId] = useState<string | null>(null);
  const [stagingOpen, setStagingOpen] = useState(false);
  const [layoutPanelOpen, setLayoutPanelOpen] = useState(false);
  const [dialogPortalHost, setDialogPortalHost] =
    useState<HTMLDivElement | null>(null);
  const dragApiRef = useRef<StorageCanvasDragApi | null>(null);
  const zoomApiRef = useRef<StorageCanvasZoomState | null>(null);
  const isSliderDraggingRef = useRef(false);
  const [dragMeta, setDragMeta] = useState({
    draggedBoxId: null as string | null,
    hoveredBoxId: null as string | null,
    isStagingDragOver: false,
  });
  const [zoomUi, setZoomUi] = useState({
    zoom: 1,
    zoomMax: 1,
    zoomSliderValue: 0,
  });
  const [zoomReady, setZoomReady] = useState(false);
  const handleDragMetaChange = useCallback(
    (meta: typeof dragMeta) =>
      setDragMeta((prev) =>
        prev.draggedBoxId === meta.draggedBoxId &&
        prev.hoveredBoxId === meta.hoveredBoxId &&
        prev.isStagingDragOver === meta.isStagingDragOver
          ? prev
          : meta,
      ),
    [],
  );
  const handleZoomStateChange = useCallback((state: StorageCanvasZoomState) => {
    setZoomReady((ready) => (ready ? ready : true));
    setZoomUi((prev) =>
      prev.zoom === state.zoom &&
      prev.zoomMax === state.zoomMax &&
      prev.zoomSliderValue === state.zoomSliderValue
        ? prev
        : {
            zoom: state.zoom,
            zoomMax: state.zoomMax,
            zoomSliderValue: state.zoomSliderValue,
          },
    );
  }, []);

  const isSearchMatch = useCallback(
    (boxId: string): boolean => !!matchingBoxIds && matchingBoxIds.has(boxId),
    [matchingBoxIds],
  );
  const getBoxHighlight = useCallback(
    (
      boxId: string,
      opts: {
        isDragging: boolean;
      },
    ) =>
      boxHighlightCn({
        isDragging: opts.isDragging,
        isSearchMatch: searchActive && isSearchMatch(boxId),
        isSearchHighlight: highlightedBoxId === boxId,
        isFocused: focusedBoxId === boxId && !editMode,
      }),
    [searchActive, isSearchMatch, highlightedBoxId, focusedBoxId, editMode],
  );

  const roomWcm = roomSize.width * 100;
  const roomHcm = roomSize.depth * 100;
  const roomHeightCm = roomSize.height * 100;
  const placedBoxes = boxes.filter(isPlaced);
  const unplacedBoxes = boxes.filter((b) => !isPlaced(b));

  const placedBoxDims = useMemo(
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
  const stacks = useMemo(() => computeStacks(placedBoxDims), [placedBoxDims]);
  const expandedStack =
    stacks.find((s) => s.topBoxId === expandedStackId) ?? null;
  const expandedBoxIds = useMemo(
    () =>
      expandedStack ? new Set(expandedStack.boxes.map((b) => b.id)) : null,
    [expandedStack],
  );

  useEffect(() => {
    if (
      expandedStackId &&
      !stacks.some((s) => s.topBoxId === expandedStackId)
    ) {
      setExpandedStackId(null);
    }
  }, [expandedStackId, stacks]);

  useEffect(() => {
    if (!expandedStackId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedStackId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedStackId]);

  const resetZoomTarget = isFullscreen ? FULLSCREEN_DEFAULT_ZOOM : 1;

  const handleZoomToPlacedBox = useCallback((box: PlacedBox) => {
    zoomApiRef.current?.zoomToBox(box.x, box.y, box.sizeW, box.sizeD);
  }, []);

  const handlePlacedBoxClick = useCallback(
    (box: Pick<PlacedBox, "id" | "x" | "y" | "z" | "sizeW" | "sizeD">) => {
      setFocusedBoxId(box.id);
      if (!editMode && !(expandedBoxIds?.has(box.id) ?? false)) {
        handleZoomToPlacedBox(box as PlacedBox);
      }
    },
    [editMode, expandedBoxIds, handleZoomToPlacedBox],
  );

  const focusedBox = boxes.find((b) => b.id === focusedBoxId) ?? null;
  const { draggedBoxId, hoveredBoxId, isStagingDragOver } = dragMeta;
  const dragApi = dragApiRef.current;
  const isCanvasDragActive =
    editMode && (draggedBoxId !== null || dragApi?.isPointerDragging === true);

  useEffect(() => {
    if (isCanvasDragActive) {
      setStagingOpen(true);
    }
  }, [isCanvasDragActive]);

  const hasLayoutControls =
    !!onCreatePartition &&
    !!onDeletePartition &&
    !!onCreateLayoutLabel &&
    !!onDeleteLayoutLabel;
  const layoutItemCount = partitions.length + layoutLabels.length;

  useEffect(() => {
    if (isFullscreen && layoutEditMode && hasLayoutControls) {
      setLayoutPanelOpen(true);
    }
  }, [isFullscreen, layoutEditMode, hasLayoutControls]);

  useEffect(() => {
    if (!onDialogPortalHostChange) return;
    onDialogPortalHostChange(isFullscreen ? dialogPortalHost : null);
    return () => onDialogPortalHostChange(null);
  }, [isFullscreen, dialogPortalHost, onDialogPortalHostChange]);

  useEffect(() => {
    if (!onFullscreenControlChange) return;
    onFullscreenControlChange({ toggle: toggleFullscreen, isFullscreen });
    return () => onFullscreenControlChange(null);
  }, [onFullscreenControlChange, toggleFullscreen, isFullscreen]);

  const canvasRegion = (
    <StorageCanvas
      boxes={boxes}
      editMode={editMode}
      layoutEditMode={layoutEditMode}
      searchActive={searchActive}
      matchingBoxIds={matchingBoxIds}
      highlightedBoxId={highlightedBoxId}
      focusedBoxId={focusedBoxId}
      expandedStackId={expandedStackId}
      onExpandedStackIdChange={setExpandedStackId}
      onBoxClick={handlePlacedBoxClick}
      onMoveBox={onMoveBox}
      roomWcm={roomWcm}
      roomHcm={roomHcm}
      roomHeightCm={roomHeightCm}
      partitions={partitions}
      layoutLabels={layoutLabels}
      onMovePartition={onMovePartition}
      onMoveLayoutLabel={onMoveLayoutLabel}
      onTemplatePlaced={onTemplatePlaced}
      isFullscreen={isFullscreen}
      resetZoomTarget={resetZoomTarget}
      dragApiRef={dragApiRef}
      layoutDragApiRef={layoutDragApiRef}
      zoomApiRef={zoomApiRef}
      onDragMetaChange={handleDragMetaChange}
      onLayoutDragMetaChange={onLayoutDragMetaChange}
      onZoomStateChange={handleZoomStateChange}
    />
  );
  const actionButtons = (
    <>
      {onAddBox && (
        <Button className="gap-2" onClick={onAddBox}>
          <Plus className="w-4 h-4" />
          <span className="hidden min-[401px]:inline">Добавить коробку</span>
        </Button>
      )}
      {onToggleLayoutEditMode && (
        <Button
          variant={layoutEditMode ? "default" : "outline"}
          className="gap-2"
          onClick={onToggleLayoutEditMode}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden min-[401px]:inline">Планировка</span>
        </Button>
      )}
      {onToggleEditMode && (
        <Button
          variant={editMode ? "default" : "outline"}
          className="gap-2"
          onClick={onToggleEditMode}
          disabled={isSavingStorage}
        >
          {editMode ? (
            <Check className="w-4 h-4" />
          ) : (
            <Edit className="w-4 h-4" />
          )}
          <span className="hidden min-[401px]:inline">
            {isSavingStorage
              ? "Сохранение…"
              : editMode
                ? "Готово"
                : "Редактировать"}
          </span>
        </Button>
      )}
    </>
  );
  const zoomControls = (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        className="w-8 h-8"
        onClick={() => zoomApiRef.current?.zoomOut()}
        disabled={!zoomReady}
        aria-label="Уменьшить"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Slider
        min={0}
        max={100}
        step={0.5}
        value={[zoomUi.zoomSliderValue]}
        onPointerDown={() => {
          isSliderDraggingRef.current = true;
        }}
        onPointerUp={() => {
          isSliderDraggingRef.current = false;
        }}
        onValueChange={(values: number[]) => {
          if (!isSliderDraggingRef.current) return;
          zoomApiRef.current?.setZoom(
            sliderValueToZoom(values[0], ZOOM_MIN, zoomUi.zoomMax),
          );
        }}
        aria-label="Масштаб"
        className="w-20 sm:w-36"
      />
      <span className="text-xs text-muted-foreground font-medium tabular-nums min-w-12 text-center select-none">
        {Math.round(zoomUi.zoom * 100)}%
        {zoomUi.zoom >= zoomUi.zoomMax && (
          <span className="text-[10px] text-muted-foreground/70 ml-0.5">
            макс.
          </span>
        )}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="w-8 h-8"
        onClick={() => zoomApiRef.current?.zoomIn()}
        disabled={!zoomReady}
        aria-label="Увеличить"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="w-8 h-8"
        onClick={() => zoomApiRef.current?.resetZoom(resetZoomTarget)}
        disabled={!zoomReady}
        aria-label="Вписать в экран"
        title="Вписать в экран"
      >
        <ScanSearch className="w-4 h-4" />
      </Button>
      <Button
        variant={isFullscreen ? "default" : "outline"}
        size="icon"
        className="w-8 h-8"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Свернуть" : "На весь экран"}
        title={isFullscreen ? "Свернуть" : "На весь экран"}
      >
        {isFullscreen ? (
          <Minimize2 className="w-4 h-4" />
        ) : (
          <Maximize2 className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
  const stagingDropHandlers =
    editMode && dragApi
      ? {
          "data-staging-drop-zone": true as const,
          onDragOverCapture: dragApi.handleStagingDragOver,
          onDragLeaveCapture: dragApi.handleStagingDragLeave,
          onDropCapture: dragApi.handleStagingDrop,
        }
      : {};

  const renderStagingList = (scrollContainer: "inner" | "none" = "inner") =>
    unplacedBoxes.length === 0 ? (
      scrollContainer === "none" && editMode ? (
        <PanelDragHint kind="emptyStaging" active={isStagingDragOver} />
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg py-2 px-2 text-center text-[10px] sm:py-6 sm:px-3 sm:text-sm transition-colors",
            editMode && isStagingDragOver
              ? "border-blue-400 dark:border-blue-600 text-blue-500 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40"
              : "border-border text-muted-foreground",
          )}
          data-staging-drop-zone
        >
          {editMode ? (
            <>
              <span className="sm:hidden">Перетащите сюда</span>
              <span className="hidden sm:inline">
                Перетащите сюда коробку с холста, чтобы убрать её
              </span>
            </>
          ) : (
            "Все коробки размещены в хранилище"
          )}
        </div>
      )
    ) : (
      <div
        className={cn(
          scrollContainer === "inner" && STORAGE_STAGING_SCROLL_CLASS,
          "flex gap-1.5 min-h-14 rounded-lg transition-colors sm:gap-3 sm:min-h-[96px]",
          scrollContainer === "inner"
            ? cn(STORAGE_STAGING_SCROLL_CLASS, "p-1.5 overflow-x-auto sm:p-3")
            : "w-max min-w-full pb-0",
          editMode && isStagingDragOver && "bg-blue-50 dark:bg-blue-950/40",
        )}
        data-staging-drop-zone
      >
        {unplacedBoxes.map((box) => {
          const isDragging = draggedBoxId === box.id;
          const isHovered = hoveredBoxId === box.id;
          const isTouchHold =
            usePointerDrag &&
            editMode &&
            dragApi?.touchHoldBoxId === box.id &&
            !isDragging;
          const dimmed = searchActive && !isSearchMatch(box.id);
          const html5Draggable = editMode && !usePointerDrag;
          return (
            <div
              key={box.id}
              className="shrink-0"
              draggable={html5Draggable}
              onDragStart={
                html5Draggable
                  ? (e) => dragApi?.handleStagingCardDragStart(e, box.id)
                  : undefined
              }
              onDragEnd={editMode ? dragApi?.handleDragEnd : undefined}
            >
              <Card
                className={cn(
                  STAGING_CARD_SIZE_CLASS,
                  "transition-[box-shadow,opacity,transform] relative overflow-hidden select-none border shadow-sm",
                  editMode && !usePointerDrag
                    ? isDragging
                      ? "cursor-grabbing"
                      : "cursor-grab"
                    : editMode && usePointerDrag
                      ? isDragging
                        ? "cursor-grabbing"
                        : "cursor-default"
                      : "cursor-pointer hover:shadow-md",
                  isTouchHold && "scale-[0.97] opacity-90",
                  getBoxHighlight(box.id, { isDragging }),
                  dimmed && !isDragging && "opacity-30",
                )}
                style={{
                  backgroundColor: box.color,
                  borderColor: getBorderColor(box.color),
                  outline:
                    editMode && isHovered && !isDragging
                      ? `2px solid ${getBorderColor(box.color).replace("0.2", "0.5").replace("0.25", "0.5")}`
                      : undefined,
                  ...(editMode && usePointerDrag
                    ? {
                        touchAction: isDragging ? "none" : "pan-x pinch-zoom",
                        WebkitTouchCallout: "none",
                        WebkitTapHighlightColor: "transparent",
                      }
                    : undefined),
                }}
                onMouseEnter={
                  editMode ? () => dragApi?.setHoveredBoxId(box.id) : undefined
                }
                onMouseLeave={
                  editMode ? () => dragApi?.setHoveredBoxId(null) : undefined
                }
                onPointerDown={
                  usePointerDrag && editMode
                    ? (e) =>
                        dragApi?.onBoxPointerDown(
                          e,
                          box.id,
                          false,
                          dragApi.getStagingOffsetPx(box.id),
                        )
                    : undefined
                }
                onClick={() => {
                  if (dragApi?.consumeClickSuppression()) return;
                  setFocusedBoxId(box.id);
                }}
              >
                {editMode && (
                  <div className="absolute top-0 left-0 z-10 flex items-center justify-center min-w-8 min-h-8 p-1.5 text-muted-foreground opacity-70 pointer-events-none">
                    <GripVertical className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                )}
                <div
                  className="p-1 sm:p-2 h-full flex flex-col items-center justify-center text-center"
                  style={{ color: getContrastColor(box.color) }}
                >
                  <BoxIcon className="w-3.5 h-3.5 mb-0.5 shrink-0 sm:w-5 sm:h-5 sm:mb-1" />
                  <p className="text-[9px] sm:text-xs font-medium wrap-break-word line-clamp-1 sm:line-clamp-2 leading-tight">
                    {box.name}
                  </p>
                  <p className="hidden sm:block text-xs opacity-70 mt-0.5">
                    {box.itemCount} предм.
                  </p>
                  <p className="hidden sm:block text-[10px] opacity-60">
                    {box.sizeW}×{box.sizeD}×{box.sizeH}см
                  </p>
                </div>
              </Card>
            </div>
          );
        })}
        {editMode && scrollContainer !== "none" && (
          <div
            className={cn(
              STAGING_CARD_SIZE_CLASS,
              "shrink-0 border-2 border-dashed border-border rounded-lg flex items-center justify-center",
            )}
          >
            <p className="text-[9px] sm:text-xs text-muted-foreground text-center px-1 sm:px-3 leading-tight">
              Перетащите сюда с холста
            </p>
          </div>
        )}
      </div>
    );
  const stagingHeader = (
    <div className="flex items-center gap-2 mb-3">
      <Inbox className="w-4 h-4 text-muted-foreground shrink-0" />
      <h3 className="text-sm font-medium text-foreground">
        Не размещённые коробки
      </h3>
      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
        {unplacedBoxes.length}
      </span>
      {editMode && isStagingDragOver && (
        <span className="ml-auto text-xs text-blue-600 dark:text-blue-300 font-medium">
          Отпустите, чтобы убрать с холста
        </span>
      )}
    </div>
  );
  const boxInfoCard = focusedBox && (
    <Card className="p-4 border transition-all duration-200">
      <div className="flex items-start gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center shadow-sm mt-0.5"
          style={{ backgroundColor: focusedBox.color }}
        >
          <BoxIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground text-sm leading-tight flex-1 min-w-0 wrap-break-word">
          {focusedBox.name}
        </p>
        <button
          className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors shrink-0 text-xs leading-none"
          onClick={() => setFocusedBoxId(null)}
          aria-label="Закрыть"
        >
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
            <Package className="w-3 h-3" />
            {focusedBox.itemCount}
          </span>
        </div>
        {isPlaced(focusedBox) ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground/70">Позиция</span>
            <span className="font-medium text-foreground tabular-nums">
              {Math.round(focusedBox.x)},{Math.round(focusedBox.y)},
              {Math.round(focusedBox.z)}
            </span>
          </div>
        ) : (
          <div className="text-muted-foreground/70 italic text-center text-[11px]">
            не размещена
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {isPlaced(focusedBox) && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => handleZoomToPlacedBox(focusedBox)}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            Приблизить
          </Button>
        )}
        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={() => {
            onBoxClick(focusedBox.id);
            setFocusedBoxId(null);
          }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Открыть коробку
        </Button>
      </div>
    </Card>
  );
  const mobileBoxInfoBar = focusedBox && (
    <Card className="p-3 flex flex-row justify-between items-center shadow-lg">
      <div className="flex flex-col gap-2">
        <div
          className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center shadow-sm"
          style={{ backgroundColor: focusedBox.color }}
        >
          <BoxIcon className="w-4 h-4 text-muted-foreground" />
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
        {isPlaced(focusedBox) && (
          <Button
            size="icon"
            variant="outline"
            className="w-8 h-8 shrink-0"
            onClick={() => handleZoomToPlacedBox(focusedBox)}
            aria-label="Приблизить"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="icon"
          className="w-8 h-8 shrink-0"
          onClick={() => {
            onBoxClick(focusedBox.id);
            setFocusedBoxId(null);
          }}
          aria-label="Открыть коробку"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        <button
          className="text-muted-foreground hover:text-foreground p-1 rounded shrink-0 text-xs leading-none"
          onClick={() => setFocusedBoxId(null)}
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
    </Card>
  );
  const emptyInfoCard = (
    <Card className="p-4 flex flex-col items-center justify-center gap-2 text-center min-h-[120px] border-dashed">
      <BoxIcon className="w-6 h-6 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground leading-snug">
        {editMode
          ? "Зажмите коробку, чтобы увидеть информацию"
          : "Нажмите на коробку, чтобы увидеть информацию"}
      </p>
    </Card>
  );
  const legend = editMode ? (
    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
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
    </div>
  ) : (
    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg">
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
    </div>
  );
  if (isFullscreen) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 bg-background overflow-hidden"
      >
        <div
          ref={setDialogPortalHost}
          className="fixed inset-0 z-100 pointer-events-none [&_[data-slot=dialog-overlay]]:pointer-events-auto [&_[data-slot=dialog-content]]:pointer-events-auto [&_[data-slot=popover-content]]:pointer-events-auto [&_[data-radix-popper-content-wrapper]]:pointer-events-auto"
        />
        <div className="relative h-full w-full overflow-hidden">
          {canvasRegion}

          {editMode && (
            <div className="absolute top-3 left-3 z-20 hidden sm:block text-sm text-blue-700 dark:text-blue-200 font-medium bg-card/95 backdrop-blur px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800 shadow">
              Режим редактирования
            </div>
          )}

          {layoutEditMode && (
            <div
              className={cn(
                "absolute top-3 z-20 hidden sm:block text-sm text-emerald-700 dark:text-emerald-200 font-medium bg-card/95 backdrop-blur px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 shadow",
                editMode ? "left-3 top-12" : "left-3",
              )}
            >
              Режим планировки
            </div>
          )}

          <div className="absolute top-3 right-3 z-20 flex flex-wrap justify-end gap-2 max-w-[calc(100%-1.5rem)]">
            {actionButtons}
            <Button
              variant="outline"
              size="icon"
              className="w-10 h-10 shrink-0"
              onClick={toggleFullscreen}
              aria-label="Свернуть"
              title="Свернуть"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>

          {focusedBox && (
            <div className="absolute z-20 w-64 right-3 top-16 hidden sm:block">
              {boxInfoCard}
            </div>
          )}

          {focusedBox && (
            <div className="absolute z-25 left-3 right-3 top-14 sm:hidden">
              {mobileBoxInfoBar}
            </div>
          )}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-card/95 backdrop-blur border border-border shadow-lg rounded-full px-3 py-1.5">
            {zoomControls}
          </div>

          <div
            className={cn(
              "absolute z-30 right-3 bottom-16 sm:bottom-3 flex flex-col items-end gap-1.5 pointer-events-none",
              stagingOpen
                ? cn("w-full", STAGING_PANEL_TWO_COLS_MAX_W)
                : "max-w-17 sm:max-w-[min(85vw,20rem)]",
            )}
          >
            <AnimatePresence>
              {stagingOpen && (
                <motion.div
                  key="staging-panel"
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.97 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{ transformOrigin: "bottom center" }}
                  className={cn(
                    "pointer-events-auto w-full flex flex-col gap-1.5 bg-card/95 backdrop-blur border border-border shadow-lg rounded-lg p-1.5 sm:rounded-xl sm:p-3 transition-colors",
                    isStagingDragOver &&
                      "border-blue-400 dark:border-blue-600 ring-2 ring-blue-400/40",
                  )}
                  {...stagingDropHandlers}
                >
                  {editMode && unplacedBoxes.length > 0 && (
                    <PanelDragHint
                      kind="dropToStaging"
                      active={isStagingDragOver}
                    />
                  )}
                  <div
                    className={cn(
                      STORAGE_STAGING_SCROLL_CLASS,
                      STAGING_SCROLL_WRAPPER_CLASS,
                    )}
                  >
                    {renderStagingList("none")}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setStagingOpen((v) => !v)}
              className={cn(
                "pointer-events-auto flex items-center gap-1.5 bg-card/95 backdrop-blur border border-border shadow-lg rounded-full px-2.5 py-1 text-xs font-medium shrink-0 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm",
                isStagingDragOver && "border-blue-400 dark:border-blue-600",
              )}
              {...stagingDropHandlers}
            >
              <Inbox className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <span className="hidden min-[401px]:inline">Не размещённые</span>
              <span className="text-[10px] sm:text-xs bg-muted text-muted-foreground px-1.5 py-px sm:px-2 sm:py-0.5 rounded-full font-medium">
                {unplacedBoxes.length}
              </span>
              {stagingOpen ? (
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>
          </div>

          {layoutEditMode && hasLayoutControls && (
            <div
              className={cn(
                "absolute z-30 left-3 bottom-16 sm:bottom-3 flex flex-col items-start gap-1.5 pointer-events-none",
                layoutPanelOpen
                  ? cn("w-full", STAGING_PANEL_TWO_COLS_MAX_W)
                  : "max-w-17 sm:max-w-[min(85vw,20rem)]",
              )}
            >
              <AnimatePresence>
                {layoutPanelOpen && (
                  <motion.div
                    key="layout-panel"
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={{ transformOrigin: "bottom center" }}
                    className={cn(
                      "pointer-events-auto w-full flex flex-col gap-1.5 bg-card/95 backdrop-blur border border-border shadow-lg rounded-lg p-1.5 sm:rounded-xl sm:p-3 transition-colors",
                    )}
                  >
                    <PanelDragHint kind="dragToCanvas" />
                    <div
                      className={cn(
                        STORAGE_STAGING_SCROLL_CLASS,
                        STAGING_SCROLL_WRAPPER_CLASS,
                      )}
                    >
                      <LayoutEditControls
                        variant="compact"
                        scrollContainer="none"
                        dialogPortalContainer={dialogPortalHost}
                        partitions={partitions}
                        layoutLabels={layoutLabels}
                        roomSize={roomSize}
                        onCreatePartition={onCreatePartition}
                        onDeletePartition={onDeletePartition}
                        onUpdatePartition={onUpdatePartition}
                        onCreateLabel={onCreateLayoutLabel}
                        onDeleteLabel={onDeleteLayoutLabel}
                        onUpdateLabel={onUpdateLayoutLabel}
                        layoutDragApi={layoutDragApi}
                        layoutEditMode={layoutEditMode}
                        usePointerDrag={usePointerDrag}
                        pendingTemplateDrop={
                          isFullscreen ? pendingTemplateDrop : null
                        }
                        onPendingTemplateDropHandled={
                          onPendingTemplateDropHandled
                        }
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => setLayoutPanelOpen((v) => !v)}
                className="pointer-events-auto flex items-center gap-1.5 bg-card/95 backdrop-blur border border-border shadow-lg rounded-full px-2.5 py-1 text-xs font-medium shrink-0 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm"
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                <span className="hidden min-[401px]:inline">Планировка</span>
                <span className="text-[10px] sm:text-xs bg-muted text-muted-foreground px-1.5 py-px sm:px-2 sm:py-0.5 rounded-full font-medium">
                  {layoutItemCount}
                </span>
                {layoutPanelOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div ref={containerRef} className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 rounded-lg border border-border">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "XY" ? "default" : "outline"}
            className="gap-2"
          >
            <Layers className="w-4 h-4" />
            Сверху
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
        <div className="space-y-4 min-w-0">
          <Card
            className={cn(
              "p-4 transition-colors duration-150",
              editMode &&
                isStagingDragOver &&
                "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 border-2",
            )}
            data-staging-drop-zone
            onDragOverCapture={
              editMode ? dragApi?.handleStagingDragOver : undefined
            }
            onDragLeaveCapture={
              editMode ? dragApi?.handleStagingDragLeave : undefined
            }
            onDropCapture={editMode ? dragApi?.handleStagingDrop : undefined}
          >
            {stagingHeader}
            {renderStagingList()}
          </Card>

          <Card className="p-4 max-[360px]:p-3">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg">Вид сверху</h3>
                {editMode && (
                  <span className="text-sm text-blue-600 dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                    Режим редактирования
                  </span>
                )}
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
    </div>
  );
}
