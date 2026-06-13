import { useState, useRef, useCallback } from "react";
import { getTransparentDragImage } from "@/shared/lib/drag-image";
import { clampLabelXY, clampPartitionXY, type LayoutRoom } from "./layoutClamp";
import {
  clientPosToCm,
  shouldUpdateDragPosition,
  type GridRect,
} from "./boxDragCoords";
import { DEFAULT_PART_DEPTH, DEFAULT_PART_WIDTH } from "./layoutDefaults";

export const LAYOUT_PARTITION_PREFIX = "layout-partition:";
export const LAYOUT_LABEL_PREFIX = "layout-label:";
export const LAYOUT_TEMPLATE_PARTITION = "layout-template:partition";
export const LAYOUT_TEMPLATE_LABEL = "layout-template:label";

export type LayoutDragItem =
  | { kind: "partition"; id: string }
  | { kind: "label"; id: string }
  | { kind: "template-partition" }
  | { kind: "template-label" };

export function isLayoutTemplateItem(item: LayoutDragItem): boolean {
  return item.kind === "template-partition" || item.kind === "template-label";
}

export function layoutDragItemKey(item: LayoutDragItem): string {
  if (item.kind === "template-partition") return "template-partition";
  if (item.kind === "template-label") return "template-label";
  return item.id;
}

export interface LayoutDragCallbacks {
  onMovePartition: (id: string, x: number, y: number) => void;
  onMoveLayoutLabel: (id: string, x: number, y: number) => void;
  onTemplatePlaced?: (data: {
    kind: "partition" | "label";
    x: number;
    y: number;
  }) => void;
}

export interface LayoutDragState {
  draggedItem: LayoutDragItem | null;
  dragOverCm: {
    xCm: number;
    yCm: number;
  } | null;
  hoveredItemId: string | null;
  gridRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (
    e: React.DragEvent,
    item: LayoutDragItem,
    offsetPx?: { pxX: number; pxY: number },
  ) => void;
  handleDragEnd: () => void;
  handleGridDragOver: (e: React.DragEvent) => void;
  handleGridDragLeave: (e: React.DragEvent) => void;
  handleGridDrop: (e: React.DragEvent) => void;
  setHoveredItemId: (id: string | null) => void;
  dragGrabOffsetRef: React.RefObject<{ pxX: number; pxY: number }>;
  dragOverCmRef: React.RefObject<{ xCm: number; yCm: number } | null>;
  updateDragOverFromClientPos: (clientX: number, clientY: number) => void;
  commitLayoutDrop: (
    item: LayoutDragItem,
    clientX: number,
    clientY: number,
    cmOverride?: { xCm: number; yCm: number } | null,
  ) => void;
  startDragSession: (
    item: LayoutDragItem,
    clientX?: number,
    clientY?: number,
  ) => void;
  clearDragSession: () => void;
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

function dragPayloadForItem(item: LayoutDragItem): string {
  if (item.kind === "partition") {
    return `${LAYOUT_PARTITION_PREFIX}${item.id}`;
  }
  if (item.kind === "label") {
    return `${LAYOUT_LABEL_PREFIX}${item.id}`;
  }
  if (item.kind === "template-partition") {
    return LAYOUT_TEMPLATE_PARTITION;
  }
  return LAYOUT_TEMPLATE_LABEL;
}

function parseDragPayload(data: string): LayoutDragItem | null {
  if (data === LAYOUT_TEMPLATE_PARTITION) {
    return { kind: "template-partition" };
  }
  if (data === LAYOUT_TEMPLATE_LABEL) {
    return { kind: "template-label" };
  }
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
  const dragOverCmRef = useRef<{ xCm: number; yCm: number } | null>(null);
  const gridRectRef = useRef<GridRect | null>(null);
  const [draggedItem, setDraggedItem] = useState<LayoutDragItem | null>(null);
  const [dragOverCm, setDragOverCm] = useState<{
    xCm: number;
    yCm: number;
  } | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const applyDrop = useCallback(
    (item: LayoutDragItem, raw: { xCm: number; yCm: number }) => {
      if (item.kind === "template-partition") {
        const { xCm, yCm } = clampPartitionXY(
          raw.xCm,
          raw.yCm,
          DEFAULT_PART_WIDTH,
          DEFAULT_PART_DEPTH,
          room,
        );
        callbacks.onTemplatePlaced?.({ kind: "partition", x: xCm, y: yCm });
        return;
      }
      if (item.kind === "template-label") {
        const { xCm, yCm } = clampLabelXY(raw.xCm, raw.yCm, room);
        callbacks.onTemplatePlaced?.({ kind: "label", x: xCm, y: yCm });
        return;
      }
      if (item.kind === "partition") {
        const partition = partitions.find((p) => p.id === item.id);
        if (!partition) return;
        const { xCm, yCm } = clampPartitionXY(
          raw.xCm,
          raw.yCm,
          partition.width,
          partition.depth,
          room,
        );
        callbacks.onMovePartition(item.id, xCm, yCm);
        return;
      }
      const { xCm, yCm } = clampLabelXY(raw.xCm, raw.yCm, room);
      callbacks.onMoveLayoutLabel(item.id, xCm, yCm);
    },
    [partitions, room, callbacks],
  );

  const getCanvasCmFromClientPos = useCallback(
    (clientX: number, clientY: number): { xCm: number; yCm: number } | null => {
      if (!gridRef.current) return null;
      const rect = gridRef.current.getBoundingClientRect();
      gridRectRef.current = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
      return clientPosToCm(
        clientX,
        clientY,
        gridRectRef.current,
        dragGrabOffsetRef.current,
        room,
      );
    },
    [room, gridRef],
  );

  const updateDragOverFromClientPos = useCallback(
    (clientX: number, clientY: number) => {
      const next = getCanvasCmFromClientPos(clientX, clientY);
      if (!next) return;
      if (!shouldUpdateDragPosition(dragOverCmRef.current, next)) return;
      dragOverCmRef.current = next;
      setDragOverCm(next);
    },
    [getCanvasCmFromClientPos],
  );

  const clearDragSession = useCallback(() => {
    setDraggedItem(null);
    setDragOverCm(null);
    dragOverCmRef.current = null;
  }, []);

  const startDragSession = useCallback(
    (item: LayoutDragItem, clientX?: number, clientY?: number) => {
      setDraggedItem(item);
      if (clientX !== undefined && clientY !== undefined) {
        updateDragOverFromClientPos(clientX, clientY);
      }
    },
    [updateDragOverFromClientPos],
  );

  const commitLayoutDrop = useCallback(
    (
      item: LayoutDragItem,
      clientX: number,
      clientY: number,
      cmOverride?: { xCm: number; yCm: number } | null,
    ) => {
      const raw = cmOverride ?? getCanvasCmFromClientPos(clientX, clientY);
      if (!raw) return;
      applyDrop(item, raw);
    },
    [applyDrop, getCanvasCmFromClientPos],
  );

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
    (
      e: React.DragEvent,
      item: LayoutDragItem,
      offsetPx?: { pxX: number; pxY: number },
    ) => {
      if (offsetPx) {
        dragGrabOffsetRef.current = offsetPx;
      } else {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        dragGrabOffsetRef.current = {
          pxX: e.clientX - rect.left,
          pxY: e.clientY - rect.top,
        };
      }
      setDraggedItem(item);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragPayloadForItem(item));
      e.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    clearDragSession();
  }, [clearDragSession]);

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
      clearDragSession();
      if (!payload) return;
      const raw = getCanvasCmFromEvent(e);
      if (!raw) return;
      applyDrop(payload, raw);
    },
    [getCanvasCmFromEvent, clearDragSession, applyDrop],
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
    dragGrabOffsetRef,
    dragOverCmRef,
    updateDragOverFromClientPos,
    commitLayoutDrop,
    startDragSession,
    clearDragSession,
  };
}
