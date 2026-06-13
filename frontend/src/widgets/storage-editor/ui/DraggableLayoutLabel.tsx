import { GripVertical } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { LayoutDragItem } from "../model/useLayoutDrag";
export interface DraggableLayoutLabelProps {
  id: string;
  text: string;
  fontSize: number;
  layoutEditMode: boolean;
  usePointerDrag?: boolean;
  isDragging: boolean;
  isHovered: boolean;
  anyDragActive: boolean;
  style?: React.CSSProperties;
  onDragStart: (e: React.DragEvent, item: LayoutDragItem) => void;
  onDragEnd: () => void;
  onPointerDown?: (e: React.PointerEvent, item: LayoutDragItem) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}
export function DraggableLayoutLabel({
  text,
  fontSize,
  layoutEditMode,
  usePointerDrag = false,
  isDragging,
  isHovered,
  anyDragActive,
  style,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onMouseEnter,
  onMouseLeave,
  id,
}: DraggableLayoutLabelProps) {
  const item: LayoutDragItem = { kind: "label", id };
  const pointerDragActive = usePointerDrag && layoutEditMode;
  return (
    <div
      className={cn(
        "absolute text-foreground font-medium whitespace-nowrap select-none flex items-start gap-0.5",
        layoutEditMode && (isDragging ? "cursor-grabbing" : "cursor-grab"),
        anyDragActive && !isDragging && "pointer-events-none",
        isDragging && "opacity-40",
        isHovered &&
          layoutEditMode &&
          !isDragging &&
          "outline outline-2 outline-primary/50 rounded",
      )}
      style={{
        ...style,
        fontSize,
        touchAction: pointerDragActive ? "none" : undefined,
        WebkitTouchCallout: pointerDragActive ? "none" : undefined,
      }}
      draggable={layoutEditMode && !usePointerDrag}
      onDragStart={(e) => onDragStart(e, item)}
      onDragEnd={onDragEnd}
      onPointerDown={
        pointerDragActive ? (e) => onPointerDown?.(e, item) : undefined
      }
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {layoutEditMode && (
        <GripVertical className="w-3 h-3 shrink-0 text-muted-foreground opacity-70" />
      )}
      <span>{text}</span>
    </div>
  );
}
