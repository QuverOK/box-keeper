import React, { memo } from "react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { darkenColor, getBorderColor } from "../lib/boxColor";

export interface DraggableBoxProps {
  id: string;
  color: string;
  editMode: boolean;
  isDragging: boolean;
  isHovered: boolean;
  isTouchHold?: boolean;
  isInteracting?: boolean;
  anyDragActive: boolean;
  style?: React.CSSProperties;
  className?: string;
  draggable?: boolean;
  usePointerDrag?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: () => void;
  children?: React.ReactNode;
}

function DraggableBoxInner({
  color,
  editMode,
  isDragging,
  isHovered,
  isTouchHold = false,
  isInteracting = false,
  anyDragActive,
  style,
  className,
  draggable,
  usePointerDrag = false,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onClick,
  children,
}: DraggableBoxProps) {
  const hoverShadow =
    editMode && isHovered && !isDragging
      ? `inset 0 0 0 2px ${darkenColor(color, 0.35)}`
      : undefined;

  const sharedClassName = cn(
    "w-full h-full relative overflow-hidden select-none border",
    !isInteracting && "transition-[box-shadow,opacity,transform]",
    editMode
      ? isDragging
        ? "cursor-grabbing"
        : "cursor-grab"
      : "cursor-pointer hover:brightness-95",
    anyDragActive && !isDragging && "pointer-events-none",
    isTouchHold && !isDragging && "scale-[0.97] opacity-90",
    usePointerDrag && "shadow-none",
    !usePointerDrag && "shadow-sm",
    className,
  );

  const sharedStyle: React.CSSProperties = {
    backgroundColor: color,
    borderColor: getBorderColor(color),
    opacity: isDragging ? 0.4 : 1,
    boxShadow: hoverShadow,
    touchAction: usePointerDrag && editMode ? "none" : undefined,
    WebkitTouchCallout: usePointerDrag && editMode ? "none" : undefined,
    WebkitTapHighlightColor: usePointerDrag ? "transparent" : undefined,
    ...style,
  };

  const sharedHandlers = {
    draggable,
    onDragStart,
    onDragEnd,
    onMouseEnter,
    onMouseLeave,
    onPointerDown,
    onClick,
  };

  if (usePointerDrag) {
    return (
      <div className={sharedClassName} style={sharedStyle} {...sharedHandlers}>
        {children}
      </div>
    );
  }

  return (
    <Card className={sharedClassName} style={sharedStyle} {...sharedHandlers}>
      {children}
    </Card>
  );
}

function draggableBoxPropsEqual(
  prev: DraggableBoxProps,
  next: DraggableBoxProps,
): boolean {
  return (
    prev.id === next.id &&
    prev.color === next.color &&
    prev.editMode === next.editMode &&
    prev.isDragging === next.isDragging &&
    prev.isHovered === next.isHovered &&
    prev.isTouchHold === next.isTouchHold &&
    prev.isInteracting === next.isInteracting &&
    prev.anyDragActive === next.anyDragActive &&
    prev.className === next.className &&
    prev.draggable === next.draggable &&
    prev.usePointerDrag === next.usePointerDrag &&
    prev.style?.opacity === next.style?.opacity &&
    prev.onDragStart === next.onDragStart &&
    prev.onDragEnd === next.onDragEnd &&
    prev.onMouseEnter === next.onMouseEnter &&
    prev.onMouseLeave === next.onMouseLeave &&
    prev.onPointerDown === next.onPointerDown &&
    prev.onClick === next.onClick
  );
}

export const DraggableBox = memo(DraggableBoxInner, draggableBoxPropsEqual);
