import { useRef, useCallback, useEffect, useState } from "react";
import { computeSettleUpdates, type PlacedBoxDims } from "./boxPlacement";
import {
  POINTER_DRAG_LONG_PRESS_MS,
  POINTER_DRAG_MOVE_CANCEL_PX,
  distancePx,
} from "./boxDragCoords";
import type { BoxDragState } from "./useBoxDrag";

export interface BoxPointerDragHandlers {
  onBoxPointerDown: (
    e: React.PointerEvent,
    boxId: string,
    fromCanvas?: boolean,
    overrideOffsetPx?: { pxX: number; pxY: number },
  ) => void;
  isPointerDragging: boolean;
  isTouchHoldActive: boolean;
  touchHoldBoxId: string | null;
}

interface PendingPointerDrag {
  boxId: string;
  pointerId: number;
  startX: number;
  startY: number;
  fromCanvas: boolean;
  overrideOffsetPx?: { pxX: number; pxY: number };
  target: HTMLElement;
}

interface UseBoxPointerDragOptions {
  enabled: boolean;
  editMode: boolean;
  dragState: Pick<
    BoxDragState,
    | "startDragSession"
    | "dragGrabOffsetRef"
    | "updateDragOverFromClientPos"
    | "commitBoxDrop"
    | "clearDragSession"
  >;
  boxes: Array<{
    id: string;
    x?: number;
    y?: number;
    z?: number;
    sizeW: number;
    sizeD: number;
    sizeH: number;
  }>;
  onMoveBox: (
    boxId: string,
    newX?: number,
    newY?: number,
    newZ?: number,
  ) => void;
  partitions?: unknown[];
}

function isPlacedBox(b: {
  x?: number;
  y?: number;
  z?: number;
}): b is { x: number; y: number; z: number } {
  return b.x !== undefined && b.y !== undefined && b.z !== undefined;
}

export function useBoxPointerDrag({
  enabled,
  editMode,
  dragState,
  boxes,
  onMoveBox,
  partitions = [],
}: UseBoxPointerDragOptions): BoxPointerDragHandlers {
  const {
    startDragSession,
    dragGrabOffsetRef,
    updateDragOverFromClientPos,
    commitBoxDrop,
    clearDragSession,
  } = dragState;

  const pendingRef = useRef<PendingPointerDrag | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDragRef = useRef<{
    boxId: string;
    pointerId: number;
    target: HTMLElement;
  } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const windowCleanupRef = useRef<(() => void) | null>(null);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const [isTouchHoldActive, setIsTouchHoldActive] = useState(false);
  const [touchHoldBoxId, setTouchHoldBoxId] = useState<string | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const releaseCapture = useCallback(
    (target: HTMLElement | null, pointerId: number) => {
      if (target?.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    },
    [],
  );

  const detachWindowListeners = useCallback(() => {
    windowCleanupRef.current?.();
    windowCleanupRef.current = null;
  }, []);

  const cancelPendingDrag = useCallback(
    (pointerId: number) => {
      clearLongPressTimer();
      detachWindowListeners();

      const pending = pendingRef.current;
      if (pending?.pointerId === pointerId) {
        releaseCapture(pending.target, pointerId);
        pendingRef.current = null;
      }

      if (activePointerIdRef.current === pointerId) {
        activePointerIdRef.current = null;
      }
      setIsTouchHoldActive(false);
      setTouchHoldBoxId(null);
    },
    [clearLongPressTimer, detachWindowListeners, releaseCapture],
  );

  const endTouchSession = useCallback(
    (pointerId: number) => {
      clearLongPressTimer();
      detachWindowListeners();

      const active = activeDragRef.current;
      if (active && active.pointerId === pointerId) {
        releaseCapture(active.target, pointerId);
        activeDragRef.current = null;
        setIsPointerDragging(false);
        clearDragSession();
      }

      if (pendingRef.current?.pointerId === pointerId) {
        releaseCapture(pendingRef.current.target, pointerId);
        pendingRef.current = null;
      }

      if (activePointerIdRef.current === pointerId) {
        activePointerIdRef.current = null;
      }
      setIsTouchHoldActive(false);
      setTouchHoldBoxId(null);
    },
    [
      clearDragSession,
      clearLongPressTimer,
      detachWindowListeners,
      releaseCapture,
    ],
  );

  const beginPointerDrag = useCallback(
    (pending: PendingPointerDrag) => {
      clearLongPressTimer();
      pendingRef.current = null;
      setTouchHoldBoxId(null);

      if (pending.overrideOffsetPx) {
        dragGrabOffsetRef.current = pending.overrideOffsetPx;
      } else if (pending.fromCanvas) {
        const rect = pending.target.getBoundingClientRect();
        dragGrabOffsetRef.current = {
          pxX: pending.startX - rect.left,
          pxY: pending.startY - rect.top,
        };
      } else {
        dragGrabOffsetRef.current = { pxX: 0, pxY: 0 };
      }

      activeDragRef.current = {
        boxId: pending.boxId,
        pointerId: pending.pointerId,
        target: pending.target,
      };
      setIsPointerDragging(true);
      startDragSession(pending.boxId, pending.startX, pending.startY);
      updateDragOverFromClientPos(pending.startX, pending.startY);
    },
    [
      clearLongPressTimer,
      dragGrabOffsetRef,
      startDragSession,
      updateDragOverFromClientPos,
    ],
  );

  const commitStagingDrop = useCallback(
    (boxId: string) => {
      const box = boxes.find((b) => b.id === boxId);
      if (!box || !isPlacedBox(box)) return;
      onMoveBox(boxId, undefined, undefined, undefined);
      const placedBoxes = boxes.filter(isPlacedBox) as PlacedBoxDims[];
      const newPlaced = placedBoxes.filter((b) => b.id !== boxId);
      for (const u of computeSettleUpdates(
        box as PlacedBoxDims,
        newPlaced,
        partitions as Parameters<typeof computeSettleUpdates>[2],
      )) {
        onMoveBox(u.id, u.x, u.y, u.z);
      }
    },
    [boxes, onMoveBox, partitions],
  );

  const attachWindowListeners = useCallback(
    (pointerId: number) => {
      detachWindowListeners();

      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;

        const pending = pendingRef.current;
        const active = activeDragRef.current;

        if (pending && !active) {
          const moved = distancePx(
            pending.startX,
            pending.startY,
            e.clientX,
            e.clientY,
          );
          if (moved > POINTER_DRAG_MOVE_CANCEL_PX) {
            cancelPendingDrag(pointerId);
            return;
          }
          e.preventDefault();
          return;
        }

        if (active && active.pointerId === pointerId) {
          e.preventDefault();
          updateDragOverFromClientPos(e.clientX, e.clientY);
        }
      };

      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;

        const pending = pendingRef.current;
        const active = activeDragRef.current;

        if (pending && !active) {
          endTouchSession(pointerId);
          return;
        }

        if (!active || active.pointerId !== pointerId) {
          endTouchSession(pointerId);
          return;
        }

        releaseCapture(active.target, pointerId);
        activeDragRef.current = null;
        setIsPointerDragging(false);
        activePointerIdRef.current = null;
        setIsTouchHoldActive(false);
        setTouchHoldBoxId(null);
        detachWindowListeners();
        clearLongPressTimer();
        pendingRef.current = null;

        const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
        const isOverStaging = dropTarget?.closest("[data-staging-drop-zone]");
        if (isOverStaging) {
          commitStagingDrop(active.boxId);
        } else {
          commitBoxDrop(active.boxId, e.clientX, e.clientY);
        }
        clearDragSession();
      };

      const onCancel = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        endTouchSession(pointerId);
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      windowCleanupRef.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
      };
    },
    [
      cancelPendingDrag,
      clearDragSession,
      clearLongPressTimer,
      commitBoxDrop,
      commitStagingDrop,
      detachWindowListeners,
      endTouchSession,
      releaseCapture,
      updateDragOverFromClientPos,
    ],
  );

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      detachWindowListeners();
    };
  }, [clearLongPressTimer, detachWindowListeners]);

  const onBoxPointerDown = useCallback(
    (
      e: React.PointerEvent,
      boxId: string,
      fromCanvas = false,
      overrideOffsetPx?: { pxX: number; pxY: number },
    ) => {
      if (!enabled || !editMode || e.pointerType !== "touch") return;
      if (e.button !== 0) return;

      if (activePointerIdRef.current !== null) {
        endTouchSession(activePointerIdRef.current);
      }

      e.preventDefault();
      e.stopPropagation();

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      activePointerIdRef.current = e.pointerId;
      setIsTouchHoldActive(true);
      setTouchHoldBoxId(boxId);

      pendingRef.current = {
        boxId,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        fromCanvas,
        overrideOffsetPx,
        target,
      };

      attachWindowListeners(e.pointerId);

      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        const pending = pendingRef.current;
        if (!pending || pending.pointerId !== e.pointerId) return;
        beginPointerDrag(pending);
      }, POINTER_DRAG_LONG_PRESS_MS);
    },
    [
      attachWindowListeners,
      beginPointerDrag,
      editMode,
      enabled,
      endTouchSession,
    ],
  );

  return {
    onBoxPointerDown,
    isPointerDragging,
    isTouchHoldActive,
    touchHoldBoxId,
  };
}

export function shouldUsePointerBoxDrag(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}
