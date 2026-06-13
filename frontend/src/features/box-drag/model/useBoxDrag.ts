import { useState, useRef, useCallback } from "react";
import { getTransparentDragImage } from "@/shared/lib/drag-image";
import {
  computeRestingZ,
  computeSettleUpdates,
  has3DConflict,
  findNearestValidXY,
  overlapsZone,
  type BoxDims,
  type PlacedBoxDims,
  type XYZone,
  type PartitionDims,
} from "./placement";
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
  const rafIdRef = useRef<number | null>(null);
  const placedBoxes = boxes.filter(isPlacedBox);
  const getCanvasCmFromEvent = useCallback(
    (
      e: React.DragEvent,
    ): {
      xCm: number;
      yCm: number;
    } | null => {
      if (!gridRef.current) return null;
      const rect = gridRef.current.getBoundingClientRect();
      const topLeftPxX = e.clientX - rect.left - dragGrabOffsetRef.current.pxX;
      const topLeftPxY = e.clientY - rect.top - dragGrabOffsetRef.current.pxY;
      return {
        xCm: (topLeftPxX / rect.width) * room.widthCm,
        yCm: (topLeftPxY / rect.height) * room.depthCm,
      };
    },
    [room.widthCm, room.depthCm],
  );
  const clampPos = (
    xCm: number,
    yCm: number,
    box: BoxDims,
  ): {
    xCm: number;
    yCm: number;
  } => ({
    xCm: Math.max(0, Math.min(xCm, room.widthCm - box.sizeW)),
    yCm: Math.max(0, Math.min(yCm, room.depthCm - box.sizeD)),
  });
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
      setDraggedBoxId(boxId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", boxId);
      e.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);
    },
    [],
  );
  const handleDragEnd = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setDraggedBoxId(null);
    setDragOverCm(null);
    setIsStagingDragOver(false);
  }, []);
  const handleGridDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsStagingDragOver(false);
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const topLeftPxX = e.clientX - rect.left - dragGrabOffsetRef.current.pxX;
      const topLeftPxY = e.clientY - rect.top - dragGrabOffsetRef.current.pxY;
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        setDragOverCm({
          xCm: (topLeftPxX / rect.width) * room.widthCm,
          yCm: (topLeftPxY / rect.height) * room.depthCm,
        });
        rafIdRef.current = null;
      });
    },
    [room.widthCm, room.depthCm],
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
      setDraggedBoxId(null);
      setDragOverCm(null);
      setIsStagingDragOver(false);
      if (!boxId || !gridRef.current) return;
      const draggedBox = boxes.find((b) => b.id === boxId);
      if (!draggedBox) return;
      const raw = getCanvasCmFromEvent(e);
      if (!raw) return;
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
      getCanvasCmFromEvent,
    ],
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
  const _ = (() => {
    if (!dragOverCm || !draggedBoxId) return null;
    const box = boxes.find((b) => b.id === draggedBoxId);
    if (!box) return null;
    const { xCm, yCm } = clampPos(dragOverCm.xCm, dragOverCm.yCm, box);
    const z = computeRestingZ(xCm, yCm, box, placedBoxes, partitions);
    const roomHeightOk = z + box.sizeH <= room.heightCm;
    const conflict = has3DConflict(xCm, yCm, z, box, placedBoxes, partitions);
    return { xCm, yCm, z, roomHeightOk, conflict };
  })();
  void _;
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
  };
}
