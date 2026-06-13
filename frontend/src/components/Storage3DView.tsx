import React, { useState, useRef, useCallback } from "react";
import {
  Box as BoxIcon,
  Layers,
  GripVertical,
  Inbox,
  ExternalLink,
  Package,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { MiniCubeViewer } from "./MiniCubeViewer";

interface Box {
  id: string;
  name: string;
  /** Physical cm from left wall. undefined = unplaced */
  x?: number;
  /** Physical cm from front wall. undefined = unplaced */
  y?: number;
  /** Physical cm from floor. undefined = unplaced */
  z?: number;
  itemCount: number;
  color: string;
  sizeW: number;
  sizeD: number;
  sizeH: number;
}

type PlacedBox = Box & { x: number; y: number; z: number };

const isPlaced = (box: Box): box is PlacedBox =>
  box.x !== undefined && box.y !== undefined && box.z !== undefined;

type ViewMode = "XY" | "XZ" | "YZ";

interface Storage3DViewProps {
  boxes: Box[];
  onBoxClick: (boxId: string) => void;
  editMode: boolean;
  highlightedBoxId?: string | null;
  gridSize: { x: number; y: number; z: number };
  onMoveBox: (
    boxId: string,
    newX?: number,
    newY?: number,
    newZ?: number,
  ) => void;
  roomSize: { width: number; depth: number; height: number };
}

export function Storage3DView({
  boxes,
  onBoxClick,
  editMode,
  highlightedBoxId,
  gridSize,
  onMoveBox,
  roomSize,
}: Storage3DViewProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("XY");
  const [draggedBoxId, setDraggedBoxId] = useState<string | null>(null);
  const [dragOverCm, setDragOverCm] = useState<{
    xCm: number;
    yCm: number;
  } | null>(null);
  const [isStagingDragOver, setIsStagingDragOver] = useState(false);
  /**
   * ID of the box shown in the info panel:
   * - normal mode → set when clicking any box
   * - edit mode   → set when drag-starting any box
   */
  const [focusedBoxId, setFocusedBoxId] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  /** Pixel offset from dragged element's top-left to cursor — set on drag start */
  const dragGrabOffsetRef = useRef({ pxX: 0, pxY: 0 });

  // ─── Box sets ────────────────────────────────────────────────────────────────
  const placedBoxes = boxes.filter(isPlaced);
  const unplacedBoxes = boxes.filter((b) => !isPlaced(b));

  // ─── Room/canvas dimension helpers ───────────────────────────────────────────

  /**
   * Returns room dimensions (in metres) for the HORIZONTAL and VERTICAL axes of
   * the current view, plus the DEPTH axis used by the layer slider.
   */
  const getRoomVisDims = (): { wM: number; hM: number; depthM: number } => {
    switch (viewMode) {
      case "XY":
        return {
          wM: roomSize.width,
          hM: roomSize.depth,
          depthM: roomSize.height,
        };
      case "XZ":
        return {
          wM: roomSize.width,
          hM: roomSize.height,
          depthM: roomSize.depth,
        };
      case "YZ":
        return {
          wM: roomSize.depth,
          hM: roomSize.height,
          depthM: roomSize.width,
        };
    }
  };

  const { wM: roomWM, hM: roomHM } = getRoomVisDims();
  const roomWcm = roomWM * 100;
  const roomHcm = roomHM * 100;
  const aspectRatioPct = (roomHM / roomWM) * 100;

  // ─── Box position helpers ────────────────────────────────────────────────────

  /**
   * Returns the box's position and size along the CANVAS axes (in cm),
   * plus its value on the DEPTH axis.
   */
  const getBoxCanvasPos = (
    box: PlacedBox,
  ): { xCm: number; yCm: number; depth: number } => {
    switch (viewMode) {
      case "XY":
        return { xCm: box.x, yCm: box.y, depth: box.z };
      case "XZ":
        return { xCm: box.x, yCm: box.z, depth: box.y };
      case "YZ":
        return { xCm: box.y, yCm: box.z, depth: box.x };
    }
  };

  /** Box visual (canvas) size in cm for the current view. depthCm = size on depth axis. */
  const getBoxVisualDims = (
    box: Box,
  ): { wCm: number; hCm: number; depthCm: number } => {
    switch (viewMode) {
      case "XY":
        return { wCm: box.sizeW, hCm: box.sizeD, depthCm: box.sizeH };
      case "XZ":
        return { wCm: box.sizeW, hCm: box.sizeH, depthCm: box.sizeD };
      case "YZ":
        return { wCm: box.sizeD, hCm: box.sizeH, depthCm: box.sizeW };
    }
  };

  /** Extracts the depth-axis physical cm value from a placed box. */
  const getBoxDepthValue = (box: PlacedBox): number => {
    switch (viewMode) {
      case "XY":
        return box.z;
      case "XZ":
        return box.y;
      case "YZ":
        return box.x;
    }
  };

  // ─── View labels ─────────────────────────────────────────────────────────────
  const getViewModeLabel = () => {
    switch (viewMode) {
      case "XY":
        return "Вид сверху";
      case "XZ":
        return "Вид сбоку";
      case "YZ":
        return "Вид спереди";
    }
  };

  // ─── Visibility & opacity ────────────────────────────────────────────────────

  // Always show all placed boxes
  const visibleBoxes = placedBoxes;

  // Highest Z among ALL placed boxes — used to normalise opacity
  const maxPlacedZ = placedBoxes.reduce((m, b) => Math.max(m, b.z), 0);

  /**
   * Higher z → more opaque (closer to the viewer when looking down).
   * When all boxes are on the floor (maxPlacedZ === 0) every box is fully opaque.
   */
  const getBoxOpacity = (box: PlacedBox): number => {
    if (maxPlacedZ === 0) return 1.0;
    // Normalise by the highest Z among all placed boxes
    return Math.max(0.3, Math.min(1.0, 0.3 + 0.7 * (box.z / maxPlacedZ)));
  };

  // ─── Placement helpers ────────────────────────────────────────────────────────

  /**
   * Converts canvas cm position to 3D physical coordinates.
   * existingDepth: keep the box on its current depth layer (for moves).
   * undefined: box is placed on the floor (depth = 0) for non-XY views.
   */
  const getPlacementCoords3D = (
    canvasXCm: number,
    canvasYCm: number,
    existingDepth?: number,
  ): { x: number; y: number; z: number } => {
    const depth = existingDepth ?? 0;
    switch (viewMode) {
      case "XY":
        return { x: canvasXCm, y: canvasYCm, z: depth };
      case "XZ":
        return { x: canvasXCm, y: depth, z: canvasYCm };
      case "YZ":
        return { x: depth, y: canvasXCm, z: canvasYCm };
    }
  };

  // ─── Physics stacking helpers ────────────────────────────────────────────────

  /**
   * Computes the natural resting Z for a box placed at physical (x, y).
   * Gravity: box rests on the highest surface where ≥60% of its footprint
   * is supported. Multiple boxes at the same height contribute combined support.
   * Always view-independent (uses physical X/Y/Z).
   */
  const computeRestingZ = (x: number, y: number, box: Box): number => {
    const others = placedBoxes.filter((b) => b.id !== box.id);
    const boxArea = box.sizeW * box.sizeD;

    // Accumulate support area per top-surface height
    const surfaces = new Map<number, number>(); // surfaceZ → total overlap cm²
    for (const b of others) {
      const ow = Math.max(
        0,
        Math.min(x + box.sizeW, b.x + b.sizeW) - Math.max(x, b.x),
      );
      const od = Math.max(
        0,
        Math.min(y + box.sizeD, b.y + b.sizeD) - Math.max(y, b.y),
      );
      const area = ow * od;
      if (area > 0) {
        const top = b.z + b.sizeH;
        surfaces.set(top, (surfaces.get(top) ?? 0) + area);
      }
    }

    // Choose the highest surface with ≥60% combined support
    let bestZ = 0; // floor is always valid support
    surfaces.forEach((area, surfZ) => {
      if (area / boxArea >= 0.6) {
        bestZ = Math.max(bestZ, surfZ);
      }
    });
    return bestZ;
  };

  /**
   * Returns true if placing box at physical (x, y, z) would 3-D overlap any
   * other box. Touching edges (strict < / >) are allowed.
   */
  const has3DConflict = (x: number, y: number, z: number, box: Box): boolean =>
    placedBoxes.some((b) => {
      if (b.id === box.id) return false;
      const xOk = x < b.x + b.sizeW && x + box.sizeW > b.x;
      const yOk = y < b.y + b.sizeD && y + box.sizeD > b.y;
      const zOk = z < b.z + b.sizeH && z + box.sizeH > b.z;
      return xOk && yOk && zOk;
    });

  /**
   * Searches outward from (desiredX, desiredY) in XY canvas space to find
   * the nearest valid placement respecting stacking physics and room bounds.
   * Only used for XY view (gravity is along Z in XY view).
   */
  const findNearestValidXY = (
    desiredX: number,
    desiredY: number,
    box: Box,
  ): { x: number; y: number; z: number } | null => {
    const roomHeightCm = roomSize.height * 100;

    const tryPos = (
      rx: number,
      ry: number,
    ): { x: number; y: number; z: number } | null => {
      const cx = Math.max(0, Math.min(rx, roomWcm - box.sizeW));
      const cy = Math.max(0, Math.min(ry, roomHcm - box.sizeD));
      const z = computeRestingZ(cx, cy, box);
      if (z + box.sizeH > roomHeightCm) return null;
      if (has3DConflict(cx, cy, z, box)) return null;
      return { x: cx, y: cy, z };
    };

    const exact = tryPos(desiredX, desiredY);
    if (exact) return exact;

    // Spiral outward in 5 cm steps, up to 200 cm radius
    for (let radius = 5; radius <= 200; radius += 5) {
      const numAngles = Math.max(8, Math.round((2 * Math.PI * radius) / 5));
      for (let i = 0; i < numAngles; i++) {
        const angle = (i / numAngles) * 2 * Math.PI;
        const result = tryPos(
          desiredX + radius * Math.cos(angle),
          desiredY + radius * Math.sin(angle),
        );
        if (result) return result;
      }
    }
    return null;
  };

  // ─── Canvas mouse position → cm ──────────────────────────────────────────────

  const getCanvasCmFromEvent = (
    e: React.DragEvent,
  ): { xCm: number; yCm: number } | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    // Apply grab offset so the box's top-left follows the cursor correctly
    const topLeftPxX = e.clientX - rect.left - dragGrabOffsetRef.current.pxX;
    const topLeftPxY = e.clientY - rect.top - dragGrabOffsetRef.current.pxY;
    return {
      xCm: (topLeftPxX / rect.width) * roomWcm,
      yCm: (topLeftPxY / rect.height) * roomHcm,
    };
  };

  /** Clamp box position so it stays within room bounds. */
  const clampPos = (
    xCm: number,
    yCm: number,
    box: Box,
  ): { xCm: number; yCm: number } => {
    const { wCm, hCm } = getBoxVisualDims(box);
    return {
      xCm: Math.max(0, Math.min(xCm, roomWcm - wCm)),
      yCm: Math.max(0, Math.min(yCm, roomHcm - hCm)),
    };
  };

  // ─── Drag events ─────────────────────────────────────────────────────────────

  /**
   * fromCanvas = true  → record actual pixel grab offset from the box element
   * fromCanvas = false → staging card; use (0,0) so box top-left lands at cursor
   */
  const handleDragStart = (
    e: React.DragEvent,
    boxId: string,
    fromCanvas = false,
  ) => {
    if (fromCanvas) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      dragGrabOffsetRef.current = {
        pxX: e.clientX - rect.left,
        pxY: e.clientY - rect.top,
      };
    } else {
      dragGrabOffsetRef.current = { pxX: 0, pxY: 0 };
    }
    setDraggedBoxId(boxId);
    // Show info panel for the box being dragged (edit mode behaviour)
    setFocusedBoxId(boxId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", boxId);
  };

  const handleDragEnd = () => {
    setDraggedBoxId(null);
    setDragOverCm(null);
    setIsStagingDragOver(false);
    // Keep focusedBoxId so the panel stays visible after the drag
  };

  const handleGridDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsStagingDragOver(false);
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const topLeftPxX = e.clientX - rect.left - dragGrabOffsetRef.current.pxX;
      const topLeftPxY = e.clientY - rect.top - dragGrabOffsetRef.current.pxY;
      setDragOverCm({
        xCm: (topLeftPxX / rect.width) * roomWcm,
        yCm: (topLeftPxY / rect.height) * roomHcm,
      });
    },
    [roomWcm, roomHcm],
  );

  const handleGridDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCm(null);
    }
  };

  const handleGridDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const boxId = e.dataTransfer.getData("text/plain");
    setDraggedBoxId(null);
    setDragOverCm(null);
    setIsStagingDragOver(false);

    if (!boxId || !gridRef.current) return;
    const draggedBox = boxes.find((b) => b.id === boxId);
    if (!draggedBox) return;

    const raw = getCanvasCmFromEvent(e);
    if (!raw) return;

    if (viewMode === "XY") {
      // ── XY: gravity determines Z (stacking physics) ──────────────────────
      const result = findNearestValidXY(raw.xCm, raw.yCm, draggedBox);
      if (!result) return; // room is completely full (unlikely)
      onMoveBox(boxId, result.x, result.y, result.z);
    } else {
      // ── XZ / YZ: user sets position explicitly, check for conflict ────────
      const { xCm, yCm } = clampPos(raw.xCm, raw.yCm, draggedBox);
      const existingDepth = isPlaced(draggedBox)
        ? getBoxDepthValue(draggedBox)
        : undefined;
      const { x, y, z } = getPlacementCoords3D(xCm, yCm, existingDepth);
      const roomHeightCm = roomSize.height * 100;
      if (z + draggedBox.sizeH > roomHeightCm) return;
      if (has3DConflict(x, y, z, draggedBox)) {
        // Snap to nearest valid in physical XY space
        const snapped = findNearestValidXY(x, y, draggedBox);
        if (snapped) onMoveBox(boxId, snapped.x, snapped.y, snapped.z);
        return;
      }
      onMoveBox(boxId, x, y, z);
    }
  };

  // ─── Staging drag handlers ───────────────────────────────────────────────────

  const handleStagingDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCm(null);
    setIsStagingDragOver(true);
  };

  const handleStagingDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsStagingDragOver(false);
    }
  };

  const handleStagingDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const boxId = e.dataTransfer.getData("text/plain");
    setDraggedBoxId(null);
    setDragOverCm(null);
    setIsStagingDragOver(false);
    if (!boxId) return;
    const box = boxes.find((b) => b.id === boxId);
    if (!box || !isPlaced(box)) return;
    onMoveBox(boxId, undefined, undefined, undefined);
  };

  // ─── Ghost indicator ──────────────────────────────────────────────────────────

  const draggedBoxDisplay = boxes.find((b) => b.id === draggedBoxId);
  const draggedBoxPlaced =
    draggedBoxDisplay && isPlaced(draggedBoxDisplay) ? draggedBoxDisplay : null;

  const ghost = (() => {
    if (!editMode || !dragOverCm || !draggedBoxDisplay) return null;
    const { wCm, hCm } = getBoxVisualDims(draggedBoxDisplay);
    const { xCm, yCm } = clampPos(
      dragOverCm.xCm,
      dragOverCm.yCm,
      draggedBoxDisplay,
    );

    let hasCollision = false;
    let stackLabel: string | null = null;

    if (viewMode === "XY") {
      const z = computeRestingZ(xCm, yCm, draggedBoxDisplay);
      const roomHeightCm = roomSize.height * 100;
      if (z + draggedBoxDisplay.sizeH > roomHeightCm) {
        hasCollision = true;
      } else if (has3DConflict(xCm, yCm, z, draggedBoxDisplay)) {
        hasCollision = true;
      } else if (z > 0) {
        stackLabel = `+${Math.round(z)} см`;
      }
    } else {
      const existingDepth = draggedBoxPlaced
        ? getBoxDepthValue(draggedBoxPlaced)
        : undefined;
      const { x, y, z } = getPlacementCoords3D(xCm, yCm, existingDepth);
      hasCollision = has3DConflict(x, y, z, draggedBoxDisplay);
    }

    return {
      leftPct: (xCm / roomWcm) * 100,
      topPct: (yCm / roomHcm) * 100,
      widthPct: (wCm / roomWcm) * 100,
      heightPct: (hCm / roomHcm) * 100,
      hasCollision,
      stackLabel, // shown when box would stack on top of another
    };
  })();

  // ─── Focused box (for info panel) ────────────────────────────────────────────

  const focusedBox = boxes.find((b) => b.id === focusedBoxId) ?? null;

  // ─── CSS style for a placed box on the canvas ─────────────────────────────────

  const boxCanvasStyle = (box: Box, xCm: number, yCm: number) => {
    const { wCm, hCm } = getBoxVisualDims(box);
    return {
      left: `${(xCm / roomWcm) * 100}%`,
      top: `${(yCm / roomHcm) * 100}%`,
      width: `${(wCm / roomWcm) * 100}%`,
      height: `${(hCm / roomHcm) * 100}%`,
    };
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── View Mode Controls ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg border">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "XY" ? "default" : "outline"}
            onClick={() => setViewMode("XY")}
            className="gap-2"
          >
            <Layers className="w-4 h-4" />
            Сверху (XY)
          </Button>
          {/* <Button
            variant={viewMode === "XZ" ? "default" : "outline"}
            onClick={() => setViewMode("XZ")}
            className="gap-2"
          >
            <Layers className="w-4 h-4 rotate-90" />
            Сбоку (XZ)
          </Button>
          <Button
            variant={viewMode === "YZ" ? "default" : "outline"}
            onClick={() => setViewMode("YZ")}
            className="gap-2"
          >
            <Layers className="w-4 h-4 -rotate-90" />
            Спереди (YZ)
          </Button> */}
        </div>
      </div>

      {/* ── Grid + Mini Viewer ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
        <div className="space-y-4">
          {/* ── Staging area ──────────────────────────────────────────────── */}
          <Card
            className={[
              "p-4 transition-colors duration-150",
              editMode && isStagingDragOver
                ? "bg-blue-50 border-blue-400 border-2"
                : "",
            ].join(" ")}
            onDragOver={editMode ? handleStagingDragOver : undefined}
            onDragLeave={editMode ? handleStagingDragLeave : undefined}
            onDrop={editMode ? handleStagingDrop : undefined}
          >
            <div className="flex items-center gap-2 mb-3">
              <Inbox className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <h3 className="text-sm font-medium text-gray-700">
                Не размещённые коробки
              </h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {unplacedBoxes.length}
              </span>
              {editMode && isStagingDragOver && (
                <span className="ml-auto text-xs text-blue-600 font-medium">
                  Отпустите, чтобы убрать с холста
                </span>
              )}
            </div>

            {unplacedBoxes.length === 0 ? (
              <div
                className={[
                  "border-2 border-dashed rounded-lg py-6 text-center text-sm transition-colors",
                  editMode && isStagingDragOver
                    ? "border-blue-400 text-blue-500 bg-blue-50"
                    : "border-gray-200 text-gray-400",
                ].join(" ")}
              >
                {editMode
                  ? "Перетащите сюда коробку с холста, чтобы убрать её"
                  : "Все коробки размещены в хранилище"}
              </div>
            ) : (
              <div
                className={[
                  "flex gap-3 overflow-x-auto pb-1 min-h-[96px] rounded-lg transition-colors",
                  editMode && isStagingDragOver ? "bg-blue-50" : "",
                ].join(" ")}
              >
                {unplacedBoxes.map((box) => {
                  const isDragging = draggedBoxId === box.id;
                  return (
                    <div
                      key={box.id}
                      className="flex-shrink-0"
                      draggable={editMode}
                      onDragStart={
                        editMode
                          ? (e) => handleDragStart(e, box.id, false)
                          : undefined
                      }
                      onDragEnd={editMode ? handleDragEnd : undefined}
                    >
                      <Card
                        className={[
                          "w-28 h-24 transition-all relative overflow-hidden select-none",
                          editMode
                            ? "cursor-grab active:cursor-grabbing hover:shadow-md"
                            : "cursor-pointer hover:shadow-md",
                          isDragging
                            ? "opacity-40 ring-2 ring-blue-400 ring-offset-1"
                            : "",
                          focusedBoxId === box.id && !editMode
                            ? "ring-2 ring-violet-400 ring-offset-1"
                            : "",
                          highlightedBoxId === box.id
                            ? "ring-4 ring-amber-400 ring-offset-2"
                            : "",
                        ].join(" ")}
                        style={{ backgroundColor: box.color }}
                        onClick={() => setFocusedBoxId(box.id)}
                      >
                        {editMode && (
                          <div className="absolute top-1 left-1 text-gray-500 opacity-50">
                            <GripVertical className="w-3 h-3" />
                          </div>
                        )}
                        <div className="p-2 h-full flex flex-col items-center justify-center text-center">
                          <BoxIcon className="w-5 h-5 mb-1 flex-shrink-0" />
                          <p className="text-xs font-medium break-words line-clamp-2 leading-tight">
                            {box.name}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {box.itemCount} предм.
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {box.sizeW}×{box.sizeD}×{box.sizeH}см
                          </p>
                        </div>
                      </Card>
                    </div>
                  );
                })}
                {editMode && (
                  <div className="flex-shrink-0 w-28 h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-xs text-gray-400 text-center px-3">
                      Перетащите сюда с холста
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ── Main canvas card ──────────────────────────────────────────── */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg">{getViewModeLabel()}</h3>
              </div>
              {editMode && (
                <span className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  Режим редактирования
                </span>
              )}
            </div>

            {/*
              Outer div establishes aspect ratio via padding-bottom trick.
              clamp(280px, X%, 580px) keeps the canvas in a usable height range.
            */}
            <div
              className="relative w-full"
              style={{
                paddingBottom: `clamp(280px, ${aspectRatioPct.toFixed(2)}%, 580px)`,
              }}
            >
              {/* White canvas — receives drop events */}
              <div
                ref={gridRef}
                className="absolute inset-0 bg-white rounded-lg border border-gray-200 overflow-hidden"
                onDragOver={editMode ? handleGridDragOver : undefined}
                onDragLeave={editMode ? handleGridDragLeave : undefined}
                onDrop={editMode ? handleGridDrop : undefined}
              >
                {/* ── Ghost drop preview ──────────────────────────────── */}
                {ghost && (
                  <div
                    className={[
                      "absolute pointer-events-none rounded-md border-2 border-dashed transition-all flex items-center justify-center",
                      ghost.hasCollision
                        ? "bg-red-100 border-red-400"
                        : ghost.stackLabel
                          ? "bg-green-100 border-green-400"
                          : "bg-blue-100 border-blue-400",
                    ].join(" ")}
                    style={{
                      left: `${ghost.leftPct}%`,
                      top: `${ghost.topPct}%`,
                      width: `${ghost.widthPct}%`,
                      height: `${ghost.heightPct}%`,
                      opacity: 0.75,
                    }}
                  >
                    {ghost.stackLabel && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100/80 px-1 rounded leading-none select-none">
                        {ghost.stackLabel}
                      </span>
                    )}
                  </div>
                )}

                {/* ── Placed boxes ─────────────────────────────────────── */}
                {visibleBoxes.map((box) => {
                  const opacity = getBoxOpacity(box);
                  if (opacity === 0) return null;
                  const isDragging = draggedBoxId === box.id;
                  const { xCm, yCm } = getBoxCanvasPos(box);

                  return (
                    <div
                      key={box.id}
                      className="absolute p-[2px]"
                      style={boxCanvasStyle(box, xCm, yCm)}
                    >
                      <Card
                        className={[
                          "w-full h-full transition-all relative overflow-hidden select-none",
                          editMode
                            ? "cursor-grab active:cursor-grabbing"
                            : "cursor-pointer hover:brightness-95",
                          isDragging
                            ? "ring-2 ring-blue-400 ring-offset-1"
                            : "",
                          focusedBoxId === box.id && !editMode
                            ? "ring-2 ring-violet-400 ring-offset-1"
                            : "",
                          highlightedBoxId === box.id
                            ? "ring-4 ring-amber-400 ring-offset-2"
                            : "",
                        ].join(" ")}
                        style={{
                          backgroundColor: box.color,
                          opacity: isDragging ? 0.4 : opacity,
                          border: "1px solid rgba(0,0,0,0.08)",
                          transition: "box-shadow 0.2s, ring 0.2s",
                        }}
                        draggable={editMode}
                        onDragStart={
                          editMode
                            ? (e) => handleDragStart(e, box.id, true)
                            : undefined
                        }
                        onDragEnd={editMode ? handleDragEnd : undefined}
                        onClick={() => setFocusedBoxId(box.id)}
                      >
                        {editMode && (
                          <div className="absolute top-0.5 left-0.5 text-gray-500/50 pointer-events-none">
                            <GripVertical className="w-3 h-3" />
                          </div>
                        )}
                      </Card>
                    </div>
                  );
                })}

                {/* Empty canvas hint */}
                {visibleBoxes.length === 0 && !ghost && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-sm text-gray-300 select-none">
                      {editMode
                        ? "Перетащите коробку из «не размещённых» сюда"
                        : "Пусто"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Legend */}
            {editMode ? (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 mb-1 font-semibold">
                  Режим перестановки:
                </p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>
                    • Перетащите коробку из «не размещённых» в любое место
                    холста
                  </li>
                  <li>
                    • Перетащите коробку с холста обратно в «не размещённые»
                  </li>
                  <li>
                    • Синий контур — место свободно; красный — наложение, нельзя
                    поставить
                  </li>
                  <li>
                    • Коробки размещаются на текущем слое глубины (слайдер)
                  </li>
                </ul>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-1 font-semibold">
                  Как использовать:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Переключайте виды для просмотра с разных сторон</li>
                  <li>
                    • Слайдер — глубина просмотра: коробки ниже слайдера чуть
                    прозрачнее
                  </li>
                  <li>
                    • Синяя рамка — коробка проходит через текущий слой глубины
                  </li>
                  <li>
                    • Нажмите «Редактировать» для свободного перемещения коробок
                  </li>
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right sidebar: cube viewer + box info ──────────────────────── */}
        <div className="lg:sticky lg:top-4 h-fit flex flex-col gap-4 w-56">
          {/* <MiniCubeViewer viewMode={viewMode} gridSize={gridSize} /> */}

          {/* Box info panel */}
          {focusedBox ? (
            <Card
              className="p-4 border-l-4 transition-all duration-200"
              style={{ borderLeftColor: focusedBox.color }}
            >
              {/* Header: swatch + name + close */}
              <div className="flex items-start gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center border border-black/10 mt-0.5"
                  style={{ backgroundColor: focusedBox.color }}
                >
                  <BoxIcon className="w-4 h-4 text-gray-600" />
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-tight flex-1 min-w-0 break-words">
                  {focusedBox.name}
                </p>
                <button
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors flex-shrink-0 text-xs leading-none"
                  onClick={() => setFocusedBoxId(null)}
                  aria-label="Закрыть"
                >
                  ✕
                </button>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs text-gray-500 mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Размер</span>
                  <span className="font-medium text-gray-700">
                    {focusedBox.sizeW}×{focusedBox.sizeD}×{focusedBox.sizeH} см
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Предметов</span>
                  <span className="font-medium text-gray-700 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {focusedBox.itemCount}
                  </span>
                </div>
                {isPlaced(focusedBox) ? (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Позиция</span>
                    <span className="font-medium text-gray-700 tabular-nums">
                      {Math.round(focusedBox.x)},{Math.round(focusedBox.y)},
                      {Math.round(focusedBox.z)}
                    </span>
                  </div>
                ) : (
                  <div className="text-gray-400 italic text-center text-[11px]">
                    не размещена
                  </div>
                )}
              </div>

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
            </Card>
          ) : (
            <Card className="p-4 flex flex-col items-center justify-center gap-2 text-center min-h-[120px] border-dashed">
              <BoxIcon className="w-6 h-6 text-gray-300" />
              <p className="text-xs text-gray-400 leading-snug">
                {editMode
                  ? "Зажмите коробку, чтобы увидеть информацию"
                  : "Нажмите на коробку, чтобы увидеть информацию"}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
