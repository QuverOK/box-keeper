import React, { memo } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { DraggableBox } from "./DraggableBox";
import { getContrastColor } from "../lib/boxColor";
import { boxHighlightCn } from "../lib/box-highlight";
import type { BoxStack } from "../model/boxPlacement";
import type { FanPosition } from "../model/computeFanLayout";

export interface PlacedBoxItemData {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  sizeW: number;
  sizeD: number;
  sizeH: number;
}

export interface PlacedBoxItemProps {
  box: PlacedBoxItemData;
  roomWcm: number;
  roomHcm: number;
  editMode: boolean;
  spaceHeld: boolean;
  usePointerDrag: boolean;
  isDragging: boolean;
  isHovered: boolean;
  isSearchMatch: boolean;
  isSearchHighlight: boolean;
  isDimmed: boolean;
  isTouchHold: boolean;
  isInteracting: boolean;
  anyDragActive: boolean;
  stackInfo: { stack: BoxStack; index: number } | undefined;
  isTopOfStack: boolean;
  isInExpandedStack: boolean;
  isThisStackExpanded: boolean;
  recede: boolean;
  fanPos: FanPosition | undefined;
  maxPlacedZ: number;
  onCanvasDragStart: (e: React.DragEvent, boxId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onBoxHoverEnter: (boxId: string) => void;
  onBoxHoverLeave: () => void;
  onBoxClick: (box: PlacedBoxItemData) => void;
  onToggleStack: (stack: BoxStack) => void;
  onBoxPointerDown?: (
    e: React.PointerEvent,
    boxId: string,
    fromCanvas?: boolean,
  ) => void;
}

function getBoxOpacity(box: PlacedBoxItemData, maxPlacedZ: number): number {
  if (maxPlacedZ === 0) return 1.0;
  return Math.max(0.3, Math.min(1.0, 0.3 + 0.7 * (box.z / maxPlacedZ)));
}

function boxCanvasStyle(
  box: PlacedBoxItemData,
  xCm: number,
  yCm: number,
  roomWcm: number,
  roomHcm: number,
): React.CSSProperties {
  return {
    left: `${(xCm / roomWcm) * 100}%`,
    top: `${(yCm / roomHcm) * 100}%`,
    width: `${(box.sizeW / roomWcm) * 100}%`,
    height: `${(box.sizeD / roomHcm) * 100}%`,
  };
}

function placedBoxItemPropsEqual(
  prev: PlacedBoxItemProps,
  next: PlacedBoxItemProps,
): boolean {
  return (
    prev.box.id === next.box.id &&
    prev.box.x === next.box.x &&
    prev.box.y === next.box.y &&
    prev.box.z === next.box.z &&
    prev.box.color === next.box.color &&
    prev.box.name === next.box.name &&
    prev.roomWcm === next.roomWcm &&
    prev.roomHcm === next.roomHcm &&
    prev.editMode === next.editMode &&
    prev.spaceHeld === next.spaceHeld &&
    prev.usePointerDrag === next.usePointerDrag &&
    prev.isDragging === next.isDragging &&
    prev.isHovered === next.isHovered &&
    prev.isSearchMatch === next.isSearchMatch &&
    prev.isSearchHighlight === next.isSearchHighlight &&
    prev.isDimmed === next.isDimmed &&
    prev.isTouchHold === next.isTouchHold &&
    prev.isInteracting === next.isInteracting &&
    prev.anyDragActive === next.anyDragActive &&
    prev.isTopOfStack === next.isTopOfStack &&
    prev.isInExpandedStack === next.isInExpandedStack &&
    prev.isThisStackExpanded === next.isThisStackExpanded &&
    prev.recede === next.recede &&
    prev.maxPlacedZ === next.maxPlacedZ &&
    prev.fanPos?.leftPct === next.fanPos?.leftPct &&
    prev.fanPos?.topPct === next.fanPos?.topPct &&
    prev.stackInfo?.stack.topBoxId === next.stackInfo?.stack.topBoxId &&
    prev.stackInfo?.index === next.stackInfo?.index &&
    prev.onCanvasDragStart === next.onCanvasDragStart &&
    prev.onDragEnd === next.onDragEnd &&
    prev.onBoxHoverEnter === next.onBoxHoverEnter &&
    prev.onBoxHoverLeave === next.onBoxHoverLeave &&
    prev.onBoxClick === next.onBoxClick &&
    prev.onToggleStack === next.onToggleStack &&
    prev.onBoxPointerDown === next.onBoxPointerDown
  );
}

function PlacedBoxItemInner({
  box,
  roomWcm,
  roomHcm,
  editMode,
  spaceHeld,
  usePointerDrag,
  isDragging,
  isHovered,
  isSearchMatch,
  isSearchHighlight,
  isDimmed,
  isTouchHold,
  isInteracting,
  anyDragActive,
  stackInfo,
  isTopOfStack,
  isInExpandedStack,
  isThisStackExpanded,
  recede,
  fanPos,
  maxPlacedZ,
  onCanvasDragStart,
  onDragEnd,
  onBoxHoverEnter,
  onBoxHoverLeave,
  onBoxClick,
  onToggleStack,
  onBoxPointerDown,
}: PlacedBoxItemProps) {
  const opacity = getBoxOpacity(box, maxPlacedZ);
  if (opacity === 0) return null;

  const wrapperStyle: React.CSSProperties = fanPos
    ? {
        left: `${fanPos.leftPct}%`,
        top: `${fanPos.topPct}%`,
        width: `${(box.sizeW / roomWcm) * 100}%`,
        height: `${(box.sizeD / roomHcm) * 100}%`,
        zIndex: 30 + (stackInfo?.index ?? 0),
        transition: isInteracting
          ? undefined
          : "left 150ms ease, top 150ms ease",
      }
    : boxCanvasStyle(box, box.x, box.y, roomWcm, roomHcm);

  const baseOpacity = isDragging ? 0.4 : isDimmed ? opacity * 0.15 : opacity;
  const finalOpacity = isInExpandedStack
    ? 1
    : recede
      ? baseOpacity * 0.12
      : baseOpacity;
  const html5Draggable = editMode && !spaceHeld && !usePointerDrag;

  const highlightClass = boxHighlightCn({
    isDragging,
    isSearchMatch,
    isSearchHighlight,
    isStackExpanded: isInExpandedStack,
  });

  return (
    <div
      className={cn("absolute", recede && "pointer-events-none")}
      style={wrapperStyle}
      onClick={isInExpandedStack ? (e) => e.stopPropagation() : undefined}
    >
      <DraggableBox
        id={box.id}
        color={box.color}
        editMode={editMode}
        isDragging={isDragging}
        isHovered={isHovered}
        isTouchHold={isTouchHold}
        isInteracting={isInteracting}
        anyDragActive={anyDragActive}
        usePointerDrag={usePointerDrag}
        style={{ opacity: finalOpacity }}
        className={highlightClass}
        draggable={html5Draggable}
        onDragStart={
          html5Draggable ? (e) => onCanvasDragStart(e, box.id) : undefined
        }
        onDragEnd={editMode ? onDragEnd : undefined}
        onMouseEnter={editMode ? () => onBoxHoverEnter(box.id) : undefined}
        onMouseLeave={editMode ? onBoxHoverLeave : undefined}
        onPointerDown={
          usePointerDrag && editMode
            ? (e) => onBoxPointerDown?.(e, box.id, true)
            : undefined
        }
        onClick={() => onBoxClick(box)}
      >
        {editMode && (
          <div
            className="absolute top-0.5 left-0.5 pointer-events-none opacity-50"
            style={{ color: getContrastColor(box.color) }}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        {isInExpandedStack && (
          <div className="absolute inset-0 flex items-center justify-center p-0.5 pointer-events-none">
            <span className="text-[9px] font-medium text-foreground bg-card/80 rounded px-1 leading-tight text-center line-clamp-2 wrap-break-word">
              {box.name}
            </span>
          </div>
        )}
      </DraggableBox>

      {stackInfo && isTopOfStack && !recede && (
        <button
          type="button"
          className={cn(
            "absolute top-1 right-1 z-40 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold leading-none flex items-center justify-center shadow ring-2 ring-card transition-colors",
            isThisStackExpanded
              ? "bg-gray-700 text-white hover:bg-gray-800"
              : "bg-gray-900 text-white hover:bg-gray-700",
          )}
          title={
            isThisStackExpanded
              ? "Свернуть стопку"
              : `В стопке ${stackInfo.stack.boxes.length} коробки — нажмите, чтобы раскрыть`
          }
          onClick={(e) => {
            e.stopPropagation();
            onToggleStack(stackInfo.stack);
          }}
        >
          {isThisStackExpanded ? "✕" : `×${stackInfo.stack.boxes.length}`}
        </button>
      )}
    </div>
  );
}

export const PlacedBoxItem = memo(PlacedBoxItemInner, placedBoxItemPropsEqual);
