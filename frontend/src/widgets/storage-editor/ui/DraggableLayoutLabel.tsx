import { GripVertical } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { LayoutDragItem } from "../model/useLayoutDrag";
export interface DraggableLayoutLabelProps {
  id: string;
  text: string;
  fontSize: number;
  layoutEditMode: boolean;
  isDragging: boolean;
  isHovered: boolean;
  anyDragActive: boolean;
  style?: React.CSSProperties;
  onDragStart: (e: React.DragEvent, item: LayoutDragItem) => void;
  onDragEnd: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}
export function DraggableLayoutLabel({
  text,
  fontSize,
  layoutEditMode,
  isDragging,
  isHovered,
  anyDragActive,
  style,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
  id,
}: DraggableLayoutLabelProps) {
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
      style={{ ...style, fontSize }}
      draggable={layoutEditMode}
      onDragStart={(e) => onDragStart(e, { kind: "label", id })}
      onDragEnd={onDragEnd}
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
