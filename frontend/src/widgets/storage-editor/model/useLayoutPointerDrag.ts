import { useRef, useCallback, useEffect, useState } from "react";
import {
  POINTER_DRAG_LONG_PRESS_MS,
  POINTER_DRAG_MOVE_CANCEL_PX,
  distancePx,
} from "./boxDragCoords";
import {
  isLayoutTemplateItem,
  layoutDragItemKey,
  type LayoutDragItem,
} from "./useLayoutDrag";
import type { LayoutDragState } from "./useLayoutDrag";

export interface LayoutPointerDragHandlers {
  onLayoutPointerDown: (e: React.PointerEvent, item: LayoutDragItem) => void;
  onLayoutTemplatePointerDown: (
    e: React.PointerEvent,
    item: LayoutDragItem,
    overrideOffsetPx?: { pxX: number; pxY: number },
  ) => void;
  isPointerDragging: boolean;
  isTouchHoldActive: boolean;
  touchHoldItemId: string | null;
  touchHoldTemplate: string | null;
  consumeClickSuppression: () => boolean;
}

interface PendingPointerDrag {
  item: LayoutDragItem;
  pointerId: number;
  startX: number;
  startY: number;
  target: HTMLElement;
  overrideOffsetPx?: { pxX: number; pxY: number };
}

interface UseLayoutPointerDragOptions {
  enabled: boolean;
  layoutEditMode: boolean;
  dragState: Pick<
    LayoutDragState,
    | "startDragSession"
    | "dragGrabOffsetRef"
    | "updateDragOverFromClientPos"
    | "commitLayoutDrop"
    | "dragOverCmRef"
    | "clearDragSession"
  >;
}

export function useLayoutPointerDrag({
  enabled,
  layoutEditMode,
  dragState,
}: UseLayoutPointerDragOptions): LayoutPointerDragHandlers {
  const {
    startDragSession,
    dragGrabOffsetRef,
    updateDragOverFromClientPos,
    commitLayoutDrop,
    dragOverCmRef,
    clearDragSession,
  } = dragState;

  const pendingRef = useRef<PendingPointerDrag | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDragRef = useRef<{
    item: LayoutDragItem;
    pointerId: number;
    target: HTMLElement;
  } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const windowCleanupRef = useRef<(() => void) | null>(null);
  const suppressClickRef = useRef(false);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const [isTouchHoldActive, setIsTouchHoldActive] = useState(false);
  const [touchHoldItemId, setTouchHoldItemId] = useState<string | null>(null);
  const [touchHoldTemplate, setTouchHoldTemplate] = useState<string | null>(
    null,
  );

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

  const clearTouchHoldVisuals = useCallback(() => {
    setIsTouchHoldActive(false);
    setTouchHoldItemId(null);
    setTouchHoldTemplate(null);
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
      clearTouchHoldVisuals();
    },
    [
      clearLongPressTimer,
      clearTouchHoldVisuals,
      detachWindowListeners,
      releaseCapture,
    ],
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
      clearTouchHoldVisuals();
    },
    [
      clearDragSession,
      clearLongPressTimer,
      clearTouchHoldVisuals,
      detachWindowListeners,
      releaseCapture,
    ],
  );

  const consumeClickSuppression = useCallback(() => {
    const suppressed = suppressClickRef.current;
    suppressClickRef.current = false;
    return suppressed;
  }, []);

  const beginPointerDrag = useCallback(
    (pending: PendingPointerDrag) => {
      clearLongPressTimer();
      pendingRef.current = null;
      clearTouchHoldVisuals();
      suppressClickRef.current = true;

      pending.target.setPointerCapture(pending.pointerId);

      if (pending.overrideOffsetPx) {
        dragGrabOffsetRef.current = pending.overrideOffsetPx;
      } else {
        const rect = pending.target.getBoundingClientRect();
        dragGrabOffsetRef.current = {
          pxX: pending.startX - rect.left,
          pxY: pending.startY - rect.top,
        };
      }

      activeDragRef.current = {
        item: pending.item,
        pointerId: pending.pointerId,
        target: pending.target,
      };
      setIsPointerDragging(true);
      startDragSession(pending.item, pending.startX, pending.startY);
      updateDragOverFromClientPos(pending.startX, pending.startY);
    },
    [
      clearLongPressTimer,
      clearTouchHoldVisuals,
      dragGrabOffsetRef,
      startDragSession,
      updateDragOverFromClientPos,
    ],
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
        clearTouchHoldVisuals();
        detachWindowListeners();
        clearLongPressTimer();
        pendingRef.current = null;

        commitLayoutDrop(
          active.item,
          e.clientX,
          e.clientY,
          dragOverCmRef.current,
        );
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
      clearTouchHoldVisuals,
      commitLayoutDrop,
      detachWindowListeners,
      dragOverCmRef,
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

  const startPointerHold = useCallback(
    (
      e: React.PointerEvent,
      item: LayoutDragItem,
      overrideOffsetPx?: { pxX: number; pxY: number },
    ) => {
      if (!enabled || !layoutEditMode || e.pointerType !== "touch") return;
      if (e.button !== 0) return;

      if (activePointerIdRef.current !== null) {
        endTouchSession(activePointerIdRef.current);
      }

      e.stopPropagation();

      const target = e.currentTarget as HTMLElement;

      activePointerIdRef.current = e.pointerId;
      setIsTouchHoldActive(true);
      if (isLayoutTemplateItem(item)) {
        setTouchHoldTemplate(layoutDragItemKey(item));
        setTouchHoldItemId(null);
      } else {
        setTouchHoldItemId(item.id);
        setTouchHoldTemplate(null);
      }

      pendingRef.current = {
        item,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        target,
        overrideOffsetPx,
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
      enabled,
      endTouchSession,
      layoutEditMode,
    ],
  );

  const onLayoutPointerDown = useCallback(
    (e: React.PointerEvent, item: LayoutDragItem) => {
      startPointerHold(e, item);
    },
    [startPointerHold],
  );

  const onLayoutTemplatePointerDown = useCallback(
    (
      e: React.PointerEvent,
      item: LayoutDragItem,
      overrideOffsetPx?: { pxX: number; pxY: number },
    ) => {
      startPointerHold(e, item, overrideOffsetPx);
    },
    [startPointerHold],
  );

  return {
    onLayoutPointerDown,
    onLayoutTemplatePointerDown,
    isPointerDragging,
    isTouchHoldActive,
    touchHoldItemId,
    touchHoldTemplate,
    consumeClickSuppression,
  };
}
