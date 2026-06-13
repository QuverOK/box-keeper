import React, { useEffect, useRef } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { STORAGE_STRIP_SCROLL_CLASS } from "../model/viewportZoom";
import { DraggableBox } from "./DraggableBox";
import { boxHighlightCn } from "../lib/box-highlight";
import { getContrastColor } from "../lib/boxColor";
import type { BoxStack } from "../model/boxPlacement";
import type {
  FanLayoutResult,
  StackScrollStrip,
} from "../model/computeFanLayout";

interface StackScrollBox {
  id: string;
  name: string;
  color: string;
  sizeW: number;
  sizeD: number;
  sizeH: number;
}

export interface ExpandedStackScrollStripProps {
  stack: BoxStack;
  strip: StackScrollStrip;
  layout: FanLayoutResult["layout"];
  boxes: StackScrollBox[];
  roomWcm: number;
  roomHcm: number;
  editMode: boolean;
  spaceHeld: boolean;
  usePointerDrag: boolean;
  draggedBoxId: string | null;
  hoveredBoxId: string | null;
  searchActive: boolean;
  matchingBoxIds?: Set<string>;
  highlightedBoxId?: string | null;
  stackKey: string;
  isInteracting?: boolean;
  onBoxClick: (box: StackScrollBox) => void;
  onBoxDragStart: (e: React.DragEvent, boxId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onBoxHoverEnter: (boxId: string) => void;
  onBoxHoverLeave: () => void;
  onBoxPointerDown?: (
    e: React.PointerEvent,
    boxId: string,
    fromCanvas?: boolean,
  ) => void;
  onCollapse: () => void;
}

export function ExpandedStackScrollStrip({
  strip,
  layout,
  boxes,
  roomWcm,
  roomHcm,
  editMode,
  spaceHeld,
  usePointerDrag,
  draggedBoxId,
  hoveredBoxId,
  searchActive,
  matchingBoxIds,
  highlightedBoxId,
  stackKey,
  isInteracting = false,
  onBoxClick,
  onBoxDragStart,
  onDragEnd,
  onBoxHoverEnter,
  onBoxHoverLeave,
  onBoxPointerDown,
  onCollapse,
}: ExpandedStackScrollStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHorizontal = strip.orientation === "horizontal";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.scrollTop = 0;
  }, [stackKey]);

  const contentWidthRatio = strip.contentWidthPct / strip.viewportWidthPct;
  const contentHeightRatio = strip.contentHeightPct / strip.viewportHeightPct;

  return (
    <div
      className="absolute z-40"
      style={{
        left: `${strip.anchorLeftPct}%`,
        top: `${strip.anchorTopPct}%`,
        width: `${strip.viewportWidthPct}%`,
        height: `${strip.viewportHeightPct}%`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="absolute top-1 right-1 z-50 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold leading-none flex items-center justify-center shadow ring-2 ring-card bg-gray-700 text-white hover:bg-gray-800 transition-colors"
        title="Свернуть стопку"
        onClick={(e) => {
          e.stopPropagation();
          onCollapse();
        }}
      >
        ×{boxes.length}
      </button>
      <div
        ref={scrollRef}
        className={cn(
          STORAGE_STRIP_SCROLL_CLASS,
          "relative h-full w-full rounded-md border-2 border-gray-600 bg-card/60",
          !isInteracting && "backdrop-blur-[1px]",
          isHorizontal
            ? "overflow-x-auto overflow-y-hidden"
            : "overflow-y-auto overflow-x-hidden",
        )}
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: isHorizontal ? "pan-x pinch-zoom" : "pan-y pinch-zoom",
          overscrollBehavior: "contain",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative"
          style={
            isHorizontal
              ? {
                  width: `${contentWidthRatio * 100}%`,
                  height: "100%",
                  minWidth: `${contentWidthRatio * 100}%`,
                }
              : {
                  width: "100%",
                  height: `${contentHeightRatio * 100}%`,
                  minHeight: `${contentHeightRatio * 100}%`,
                }
          }
        >
          {boxes.map((box) => {
            const pos = layout.get(box.id);
            if (!pos) return null;

            const widthPct = (box.sizeW / roomWcm) * 100;
            const heightPct = (box.sizeD / roomHcm) * 100;
            const isDragging = draggedBoxId === box.id;
            const isHovered = hoveredBoxId === box.id;
            const isSearchMatch =
              !!matchingBoxIds && matchingBoxIds.has(box.id);
            const dimmed = searchActive && !isSearchMatch;
            const opacity = dimmed ? 0.15 : 1;
            const html5Draggable = editMode && !spaceHeld && !usePointerDrag;

            return (
              <div
                key={box.id}
                className="absolute"
                style={{
                  left: `${(pos.leftPct / strip.contentWidthPct) * 100}%`,
                  top: `${(pos.topPct / strip.contentHeightPct) * 100}%`,
                  width: `${(widthPct / strip.contentWidthPct) * 100}%`,
                  height: `${(heightPct / strip.contentHeightPct) * 100}%`,
                  boxSizing: "border-box",
                }}
              >
                <DraggableBox
                  id={box.id}
                  color={box.color}
                  editMode={editMode}
                  isDragging={isDragging}
                  isHovered={isHovered}
                  isInteracting={isInteracting}
                  anyDragActive={draggedBoxId !== null}
                  usePointerDrag={usePointerDrag}
                  style={{ opacity: isDragging ? 0.4 : opacity }}
                  className={boxHighlightCn({
                    isDragging,
                    isSearchMatch: searchActive && isSearchMatch,
                    isSearchHighlight: highlightedBoxId === box.id,
                    isStackExpanded: true,
                  })}
                  draggable={html5Draggable}
                  onDragStart={
                    html5Draggable
                      ? (e) => onBoxDragStart(e, box.id)
                      : undefined
                  }
                  onDragEnd={editMode ? onDragEnd : undefined}
                  onMouseEnter={
                    editMode ? () => onBoxHoverEnter(box.id) : undefined
                  }
                  onMouseLeave={editMode ? onBoxHoverLeave : undefined}
                  onPointerDown={
                    usePointerDrag && editMode
                      ? (e) => onBoxPointerDown?.(e, box.id, true)
                      : undefined
                  }
                  onClick={() => {
                    if (spaceHeld) return;
                    onBoxClick(box);
                  }}
                >
                  {editMode && (
                    <div
                      className="absolute top-0.5 left-0.5 pointer-events-none opacity-50"
                      style={{ color: getContrastColor(box.color) }}
                    >
                      <GripVertical className="w-3 h-3" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center p-0.5 pointer-events-none">
                    <span className="text-[9px] font-medium text-foreground bg-card/80 rounded px-1 leading-tight text-center line-clamp-2 wrap-break-word">
                      {box.name}
                    </span>
                  </div>
                </DraggableBox>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
