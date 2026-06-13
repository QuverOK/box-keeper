import { useState, useRef, useCallback } from "react";
import { getTransparentDragImage } from "@/shared/lib/drag-image";
import { clampLabelXY, clampPartitionXY, type LayoutRoom } from "./layoutClamp";
export const LAYOUT_PARTITION_PREFIX = "layout-partition:";
export const LAYOUT_LABEL_PREFIX = "layout-label:";
export interface LayoutDragItem {
  kind: "partition" | "label";
  id: string;
  width?: number;
  depth?: number;
}
export interface LayoutDragCallbacks {
  onMovePartition: (id: string, x: number, y: number) => void;
  onMoveLayoutLabel: (id: string, x: number, y: number) => void;
}
export interface LayoutDragState {
  draggedItem: LayoutDragItem | null;
  dragOverCm: {
    xCm: number;
    yCm: number;
  } | null;
  hoveredItemId: string | null;
  gridRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (e: React.DragEvent, item: LayoutDragItem) => void;
  handleDragEnd: () => void;
  handleGridDragOver: (e: React.DragEvent) => void;
  handleGridDragLeave: (e: React.DragEvent) => void;
  handleGridDrop: (e: React.DragEvent) => void;
  setHoveredItemId: (id: string | null) => void;
}
interface UseLayoutDragOptions {
  room: LayoutRoom;
  partitions: {
    id: string;
    width: number;
    depth: number;
  }[];
  callbacks: LayoutDragCallbacks;
  gridRef: React.RefObject<HTMLDivElement | null>;
}
function parseDragPayload(data: string): LayoutDragItem | null {
  if (data.startsWith(LAYOUT_PARTITION_PREFIX)) {
    return {
      kind: "partition",
      id: data.slice(LAYOUT_PARTITION_PREFIX.length),
    };
  }
  if (data.startsWith(LAYOUT_LABEL_PREFIX)) {
    return { kind: "label", id: data.slice(LAYOUT_LABEL_PREFIX.length) };
  }
  return null;
}
export function useLayoutDrag({
  room,
  partitions,
  callbacks,
  gridRef,
}: UseLayoutDragOptions): LayoutDragState {
  const dragGrabOffsetRef = useRef({ pxX: 0, pxY: 0 });
  const [draggedItem, setDraggedItem] = useState<LayoutDragItem | null>(null);
  const [dragOverCm, setDragOverCm] = useState<{
    xCm: number;
    yCm: number;
  } | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
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
    [room.widthCm, room.depthCm, gridRef],
  );
  const handleDragStart = useCallback(
    (e: React.DragEvent, item: LayoutDragItem) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      dragGrabOffsetRef.current = {
        pxX: e.clientX - rect.left,
        pxY: e.clientY - rect.top,
      };
      setDraggedItem(item);
      e.dataTransfer.effectAllowed = "move";
      const prefix =
        item.kind === "partition"
          ? LAYOUT_PARTITION_PREFIX
          : LAYOUT_LABEL_PREFIX;
      e.dataTransfer.setData("text/plain", `${prefix}${item.id}`);
      e.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);
    },
    [],
  );
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverCm(null);
  }, []);
  const handleGridDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const topLeftPxX = e.clientX - rect.left - dragGrabOffsetRef.current.pxX;
      const topLeftPxY = e.clientY - rect.top - dragGrabOffsetRef.current.pxY;
      setDragOverCm({
        xCm: (topLeftPxX / rect.width) * room.widthCm,
        yCm: (topLeftPxY / rect.height) * room.depthCm,
      });
    },
    [room.widthCm, room.depthCm, gridRef],
  );
  const handleGridDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCm(null);
    }
  }, []);
  const handleGridDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const payload = parseDragPayload(e.dataTransfer.getData("text/plain"));
      setDraggedItem(null);
      setDragOverCm(null);
      if (!payload) return;
      const raw = getCanvasCmFromEvent(e);
      if (!raw) return;
      if (payload.kind === "partition") {
        const partition = partitions.find((p) => p.id === payload.id);
        if (!partition) return;
        const { xCm, yCm } = clampPartitionXY(
          raw.xCm,
          raw.yCm,
          partition.width,
          partition.depth,
          room,
        );
        callbacks.onMovePartition(payload.id, xCm, yCm);
        return;
      }
      const { xCm, yCm } = clampLabelXY(raw.xCm, raw.yCm, room);
      callbacks.onMoveLayoutLabel(payload.id, xCm, yCm);
    },
    [getCanvasCmFromEvent, partitions, room, callbacks],
  );
  return {
    draggedItem,
    dragOverCm,
    hoveredItemId,
    gridRef,
    handleDragStart,
    handleDragEnd,
    handleGridDragOver,
    handleGridDragLeave,
    handleGridDrop,
    setHoveredItemId,
  };
}
