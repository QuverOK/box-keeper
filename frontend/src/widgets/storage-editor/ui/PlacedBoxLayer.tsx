import React, { memo } from "react";
import { PlacedBoxItem, type PlacedBoxItemData } from "./PlacedBoxItem";
import type { BoxStack } from "../model/boxPlacement";
import type { FanPosition } from "../model/computeFanLayout";

export interface PlacedBoxLayerProps {
  boxes: PlacedBoxItemData[];
  roomWcm: number;
  roomHcm: number;
  editMode: boolean;
  spaceHeld: boolean;
  usePointerDrag: boolean;
  draggedBoxId: string | null;
  hoveredBoxId: string | null;
  touchHoldBoxId: string | null;
  highlightedBoxId?: string | null;
  searchActive: boolean;
  matchingBoxIds?: Set<string>;
  expandedStackId: string | null;
  expandedBoxIds: Set<string> | null;
  isAnyExpanded: boolean;
  isScrollExpandedStack: boolean;
  isInteracting: boolean;
  fanLayout: Map<string, FanPosition>;
  stackInfoByBoxId: Map<
    string,
    {
      stack: BoxStack;
      index: number;
    }
  >;
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

export const PlacedBoxLayer = memo(function PlacedBoxLayer({
  boxes,
  roomWcm,
  roomHcm,
  editMode,
  spaceHeld,
  usePointerDrag,
  draggedBoxId,
  hoveredBoxId,
  touchHoldBoxId,
  highlightedBoxId,
  searchActive,
  matchingBoxIds,
  expandedStackId,
  expandedBoxIds,
  isAnyExpanded,
  isScrollExpandedStack,
  isInteracting,
  fanLayout,
  stackInfoByBoxId,
  maxPlacedZ,
  onCanvasDragStart,
  onDragEnd,
  onBoxHoverEnter,
  onBoxHoverLeave,
  onBoxClick,
  onToggleStack,
  onBoxPointerDown,
}: PlacedBoxLayerProps) {
  return (
    <>
      {boxes.map((box) => {
        const stackInfo = stackInfoByBoxId.get(box.id);
        const isTopOfStack = stackInfo?.stack.topBoxId === box.id;
        const isInExpandedStack = expandedBoxIds?.has(box.id) ?? false;
        if (isInExpandedStack && isScrollExpandedStack) return null;
        const isThisStackExpanded =
          stackInfo != null && expandedStackId === stackInfo.stack.topBoxId;
        const recede = isAnyExpanded && !isInExpandedStack;
        const fanPos = isInExpandedStack ? fanLayout.get(box.id) : undefined;
        const isSearchMatch = !!matchingBoxIds && matchingBoxIds.has(box.id);
        const isDimmed = searchActive && !isSearchMatch;

        return (
          <PlacedBoxItem
            key={box.id}
            box={box}
            roomWcm={roomWcm}
            roomHcm={roomHcm}
            editMode={editMode}
            spaceHeld={spaceHeld}
            usePointerDrag={usePointerDrag}
            isDragging={draggedBoxId === box.id}
            isHovered={hoveredBoxId === box.id}
            isSearchMatch={searchActive && isSearchMatch}
            isSearchHighlight={highlightedBoxId === box.id}
            isDimmed={isDimmed}
            isTouchHold={touchHoldBoxId === box.id}
            isInteracting={isInteracting}
            anyDragActive={draggedBoxId !== null}
            stackInfo={stackInfo}
            isTopOfStack={!!isTopOfStack}
            isInExpandedStack={isInExpandedStack}
            isThisStackExpanded={isThisStackExpanded}
            recede={recede}
            fanPos={fanPos}
            maxPlacedZ={maxPlacedZ}
            onCanvasDragStart={onCanvasDragStart}
            onDragEnd={onDragEnd}
            onBoxHoverEnter={onBoxHoverEnter}
            onBoxHoverLeave={onBoxHoverLeave}
            onBoxClick={onBoxClick}
            onToggleStack={onToggleStack}
            onBoxPointerDown={onBoxPointerDown}
          />
        );
      })}
    </>
  );
});
