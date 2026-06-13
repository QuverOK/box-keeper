import { useState, useRef, useCallback } from "react";
import { getTransparentDragImage } from "@/shared/lib/drag-image";
import {
  computeSettleUpdates,
  findNearestValidXY,
  overlapsZone,
  type BoxDims,
  type PlacedBoxDims,
  type XYZone,
  type PartitionDims,
} from "./boxPlacement";
import {
  clientPosToCm,
  shouldUpdateDragPosition,
  type GridRect,
} from "./boxDragCoords";

export interface DragRoom {
  widthCm: number;
  depthCm: number;
  heightCm: number;
}
export interface BoxDragCallbacks {
  onMoveBox: (
    boxId: string,
    newX?: number,
    newY?: number,
    newZ?: number,
  ) => void;
}
export interface BoxDragState {
  draggedBoxId: string | null;
  hoveredBoxId: string | null;
  dragOverCm: {
    xCm: number;
    yCm: number;
  } | null;
  isStagingDragOver: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (
    e: React.DragEvent,
    boxId: string,
    fromCanvas?: boolean,
    overrideOffsetPx?: {
      pxX: number;
      pxY: number;
    },
  ) => void;
  handleDragEnd: () => void;
  handleGridDragOver: (e: React.DragEvent) => void;
  handleGridDragLeave: (e: React.DragEvent) => void;
  handleGridDrop: (e: React.DragEvent) => void;
  handleStagingDragOver: (e: React.DragEvent) => void;
  handleStagingDragLeave: (e: React.DragEvent) => void;
  handleStagingDrop: (e: React.DragEvent) => void;
  setHoveredBoxId: (id: string | null) => void;
  dragGrabOffsetRef: React.RefObject<{ pxX: number; pxY: number }>;
  gridRectRef: React.RefObject<GridRect | null>;
  updateDragOverFromClientPos: (clientX: number, clientY: number) => void;
  commitBoxDrop: (boxId: string, clientX: number, clientY: number) => void;
  clearDragSession: () => void;
  startDragSession: (boxId: string, clientX?: number, clientY?: number) => void;
}
interface UseBoxDragOptions {
  boxes: (BoxDims & {
    x?: number;
    y?: number;
    z?: number;
  })[];
  room: DragRoom;
  callbacks: BoxDragCallbacks;
  forbiddenZoneRef?: React.RefObject<XYZone | null>;
  partitions?: PartitionDims[];
}
function isPlacedBox(
  b: BoxDims & {
    x?: number;
    y?: number;
    z?: number;
  },
): b is PlacedBoxDims {
  return b.x !== undefined && b.y !== undefined && b.z !== undefined;
}

export function useBoxDrag({
  boxes,
  room,
  callbacks,
  forbiddenZoneRef,
  partitions = [],
}: UseBoxDragOptions): BoxDragState {
  const { onMoveBox } = callbacks;
  const [draggedBoxId, setDraggedBoxId] = useState<string | null>(null);
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);
  const [dragOverCm, setDragOverCm] = useState<{
    xCm: number;
    yCm: number;
  } | null>(null);
  const [isStagingDragOver, setIsStagingDragOver] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragGrabOffsetRef = useRef({ pxX: 0, pxY: 0 });
  const gridRectRef = useRef<GridRect | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingDragPosRef = useRef<{ xCm: number; yCm: number } | null>(null);
  const draggedBoxRef = useRef<(BoxDims & { x?: number; y?: number }) | null>(
    null,
  );
  const placedBoxes = boxes.filter(isPlacedBox);

  const refreshGridRect = useCallback(() => {
    if (!gridRef.current) {
      gridRectRef.current = null;
      return null;
    }
    const rect = gridRef.current.getBoundingClientRect();
    gridRectRef.current = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
    return gridRectRef.current;
  }, []);

  const initDragPosition = useCallback(
    (boxId: string, clientX?: number, clientY?: number) => {
      const box = boxes.find((b) => b.id === boxId);
      if (!box) return;
      draggedBoxRef.current = box;

      let xCm = isPlacedBox(box) ? box.x : 0;
      let yCm = isPlacedBox(box) ? box.y : 0;
      if (clientX != null && clientY != null) {
        const rect = gridRectRef.current ?? refreshGridRect();
        if (rect) {
          const raw = clientPosToCm(
            clientX,
            clientY,
            rect,
            dragGrabOffsetRef.current,
            room,
          );
          xCm = Math.max(0, Math.min(raw.xCm, room.widthCm - box.sizeW));
          yCm = Math.max(0, Math.min(raw.yCm, room.depthCm - box.sizeD));
        }
      }

      setDragOverCm({ xCm, yCm });
    },
    [boxes, refreshGridRect, room],
  );

  const updateDragOverFromClientPos = useCallback(
    (clientX: number, clientY: number) => {
      const overStaging = document
        .elementFromPoint(clientX, clientY)
        ?.closest("[data-staging-drop-zone]");
      if (overStaging) {
        setIsStagingDragOver(true);
        setDragOverCm(null);
        return;
      }
      setIsStagingDragOver(false);

      const rect = gridRectRef.current ?? refreshGridRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      const next = clientPosToCm(
        clientX,
        clientY,
        rect,
        dragGrabOffsetRef.current,
        room,
      );

      pendingDragPosRef.current = next;
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const pending = pendingDragPosRef.current;
        if (!pending) return;
        setDragOverCm((prev) =>
          shouldUpdateDragPosition(prev, pending) ? pending : prev,
        );
      });
    },
    [room, refreshGridRect],
  );

  const clearDragSession = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    pendingDragPosRef.current = null;
    draggedBoxRef.current = null;
    gridRectRef.current = null;
    setDraggedBoxId(null);
    setDragOverCm(null);
    setIsStagingDragOver(false);
  }, []);

  const commitBoxDrop = useCallback(
    (boxId: string, clientX: number, clientY: number) => {
      const draggedBox = boxes.find((b) => b.id === boxId);
      if (!draggedBox) return;
      const rect = gridRectRef.current ?? refreshGridRect();
      if (!rect) return;
      const raw = clientPosToCm(
        clientX,
        clientY,
        rect,
        dragGrabOffsetRef.current,
        room,
      );
      if (
        forbiddenZoneRef?.current &&
        overlapsZone(raw.xCm, raw.yCm, draggedBox, forbiddenZoneRef.current)
      ) {
        return;
      }
      const result = findNearestValidXY(
        raw.xCm,
        raw.yCm,
        draggedBox,
        placedBoxes,
        room,
        null,
        partitions,
      );
      if (!result) return;
      onMoveBox(boxId, result.x, result.y, result.z);
      if (isPlacedBox(draggedBox)) {
        const movedBoxNew: PlacedBoxDims = {
          ...draggedBox,
          x: result.x,
          y: result.y,
          z: result.z,
        };
        const newPlaced = placedBoxes
          .filter((b) => b.id !== boxId)
          .concat(movedBoxNew);
        for (const u of computeSettleUpdates(
          draggedBox,
          newPlaced,
          partitions,
        )) {
          if (u.id === boxId) continue;
          onMoveBox(u.id, u.x, u.y, u.z);
        }
      }
    },
    [
      boxes,
      placedBoxes,
      room,
      onMoveBox,
      forbiddenZoneRef,
      partitions,
      refreshGridRect,
    ],
  );

  const startDragSession = useCallback(
    (boxId: string, clientX?: number, clientY?: number) => {
      refreshGridRect();
      setDraggedBoxId(boxId);
      initDragPosition(boxId, clientX, clientY);
    },
    [refreshGridRect, initDragPosition],
  );

  const handleDragStart = useCallback(
    (
      e: React.DragEvent,
      boxId: string,
      fromCanvas = false,
      overrideOffsetPx?: {
        pxX: number;
        pxY: number;
      },
    ) => {
      if (overrideOffsetPx) {
        dragGrabOffsetRef.current = overrideOffsetPx;
      } else if (fromCanvas) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        dragGrabOffsetRef.current = {
          pxX: e.clientX - rect.left,
          pxY: e.clientY - rect.top,
        };
      } else {
        dragGrabOffsetRef.current = { pxX: 0, pxY: 0 };
      }
      startDragSession(boxId, e.clientX, e.clientY);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", boxId);
      e.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);
    },
    [startDragSession],
  );
  const handleDragEnd = useCallback(() => {
    clearDragSession();
  }, [clearDragSession]);
  const handleGridDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (isStagingDragOver) setIsStagingDragOver(false);
      updateDragOverFromClientPos(e.clientX, e.clientY);
    },
    [updateDragOverFromClientPos, isStagingDragOver],
  );
  const handleGridDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCm(null);
    }
  }, []);
  const handleGridDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const boxId = e.dataTransfer.getData("text/plain");
      if (!boxId) {
        clearDragSession();
        return;
      }
      commitBoxDrop(boxId, e.clientX, e.clientY);
      clearDragSession();
    },
    [commitBoxDrop, clearDragSession],
  );
  const handleStagingDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCm(null);
    setIsStagingDragOver(true);
  }, []);
  const handleStagingDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsStagingDragOver(false);
    }
  }, []);
  const handleStagingDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const boxId = e.dataTransfer.getData("text/plain");
      setDraggedBoxId(null);
      setDragOverCm(null);
      setIsStagingDragOver(false);
      gridRectRef.current = null;
      if (!boxId) return;
      const box = boxes.find((b) => b.id === boxId);
      if (!box || !isPlacedBox(box)) return;
      onMoveBox(boxId, undefined, undefined, undefined);
      const newPlaced = placedBoxes.filter((b) => b.id !== boxId);
      for (const u of computeSettleUpdates(box, newPlaced, partitions)) {
        onMoveBox(u.id, u.x, u.y, u.z);
      }
    },
    [boxes, placedBoxes, onMoveBox, partitions],
  );
  return {
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
    dragGrabOffsetRef,
    gridRectRef,
    updateDragOverFromClientPos,
    commitBoxDrop,
    clearDragSession,
    startDragSession,
  };
}
