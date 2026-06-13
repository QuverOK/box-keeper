import { useMemo } from "react";
import { cn } from "@/shared/lib/cn";
import { computeRestingZ, has3DConflict, overlapsZone, overlapsPartitionFootprint, type BoxDims, type PlacedBoxDims, type XYZone, type PartitionDims, } from "../model/placement";
interface BoxDragGhostProps {
    draggedBox: BoxDims;
    dragOverCm: {
        xCm: number;
        yCm: number;
    };
    placedBoxes: PlacedBoxDims[];
    room: {
        widthCm: number;
        depthCm: number;
        heightCm: number;
    };
    forbiddenZone?: XYZone | null;
    partitions?: PartitionDims[];
}
export function BoxDragGhost({ draggedBox, dragOverCm, placedBoxes, room, forbiddenZone, partitions = [], }: BoxDragGhostProps) {
    const xCm = Math.max(0, Math.min(dragOverCm.xCm, room.widthCm - draggedBox.sizeW));
    const yCm = Math.max(0, Math.min(dragOverCm.yCm, room.depthCm - draggedBox.sizeD));
    const { conflict, inForbiddenZone, onPartition, stackLabel } = useMemo(() => {
        const restZ = computeRestingZ(xCm, yCm, draggedBox, placedBoxes, partitions);
        const roomHeightOk = restZ + draggedBox.sizeH <= room.heightCm;
        const forbidden = overlapsZone(xCm, yCm, draggedBox, forbiddenZone);
        const partition = overlapsPartitionFootprint(xCm, yCm, draggedBox, partitions);
        const hasConflict = !roomHeightOk ||
            partition ||
            (!forbidden && has3DConflict(xCm, yCm, restZ, draggedBox, placedBoxes, partitions));
        return {
            conflict: hasConflict,
            inForbiddenZone: forbidden,
            onPartition: partition,
            stackLabel: !hasConflict && !forbidden && restZ > 0 ? `↑${Math.round(restZ + draggedBox.sizeH)} см` : null,
        };
    }, [xCm, yCm, draggedBox, placedBoxes, forbiddenZone, partitions, room.heightCm]);
    const leftPct = (xCm / room.widthCm) * 100;
    const topPct = (yCm / room.depthCm) * 100;
    const widthPct = (draggedBox.sizeW / room.widthCm) * 100;
    const heightPct = (draggedBox.sizeD / room.depthCm) * 100;
    return (<div className={cn("absolute pointer-events-none rounded-md border-2 border-dashed transition-colors duration-100 flex items-center justify-center z-50", conflict
            ? "bg-red-100 dark:bg-red-950/40 border-red-400 dark:border-red-700"
            : stackLabel
                ? "bg-green-100 dark:bg-green-950/40 border-green-400 dark:border-green-700"
                : "bg-blue-100 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700")} style={{
            left: `${leftPct}%`,
            top: `${topPct}%`,
            width: `${widthPct}%`,
            height: `${heightPct}%`,
            opacity: 0.75,
        }}>
      {stackLabel && (<span className="text-[10px] font-bold text-green-700 dark:text-green-300 bg-green-100/80 dark:bg-green-950/60 px-1 rounded leading-none select-none">
          {stackLabel}
        </span>)}
      {inForbiddenZone && (<span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950/60 px-1 rounded leading-tight text-center select-none">
          В стопку
        </span>)}
      {!inForbiddenZone && onPartition && (<span className="text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100/80 dark:bg-red-950/60 px-1 rounded leading-tight text-center select-none">
          Перегородка
        </span>)}
    </div>);
}
