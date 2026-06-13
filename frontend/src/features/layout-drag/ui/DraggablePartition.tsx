import { GripVertical } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { LayoutDragItem } from "../model/useLayoutDrag";
export interface DraggablePartitionProps {
  id: string;
  label: string | null;
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
export function DraggablePartition({
  label,
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
}: DraggablePartitionProps) {
  return (
    <div
      className={cn(
        "absolute rounded-sm border-2 border-slate-600/80 bg-slate-500/40 select-none",
        layoutEditMode && (isDragging ? "cursor-grabbing" : "cursor-grab"),
        anyDragActive && !isDragging && "pointer-events-none",
        isDragging && "opacity-40",
        isHovered &&
          layoutEditMode &&
          !isDragging &&
          "ring-2 ring-slate-700/60",
      )}
      style={style}
      draggable={layoutEditMode}
      onDragStart={(e) => onDragStart(e, { kind: "partition", id })}
      onDragEnd={onDragEnd}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={label ?? "Перегородка"}
    >
      {layoutEditMode && (
        <div className="absolute top-0.5 left-0.5 text-slate-700/70">
          <GripVertical className="w-3 h-3" />
        </div>
      )}
      {label && (
        <span className="absolute bottom-0.5 left-1 right-1 truncate text-[10px] font-medium text-slate-800/90">
          {label}
        </span>
      )}
    </div>
  );
}
