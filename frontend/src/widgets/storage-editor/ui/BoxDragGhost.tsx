import { memo, useMemo } from "react";
import { cn } from "@/shared/lib/cn";
import {
  computeRestingZ,
  has3DConflict,
  overlapsZone,
  overlapsPartitionFootprint,
  getNearbyPlacedBoxes,
  type BoxDims,
  type PlacedBoxDims,
  type XYZone,
  type PartitionDims,
} from "../model/boxPlacement";

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
  hideStackLabel?: boolean;
}

const ghostTone = {
  conflict: {
    bg: "bg-red-100 dark:bg-red-500/30",
    ring: "ring-red-400 dark:ring-red-300",
  },
  stack: {
    bg: "bg-green-100 dark:bg-green-500/30",
    ring: "ring-green-400 dark:ring-green-300",
  },
  default: {
    bg: "bg-blue-100 dark:bg-blue-500/30",
    ring: "ring-blue-400 dark:ring-blue-300",
  },
} as const;

export const BoxDragGhost = memo(function BoxDragGhost({
  draggedBox,
  dragOverCm,
  placedBoxes,
  room,
  forbiddenZone,
  partitions = [],
  hideStackLabel = false,
}: BoxDragGhostProps) {
  const xCm = Math.max(
    0,
    Math.min(dragOverCm.xCm, room.widthCm - draggedBox.sizeW),
  );
  const yCm = Math.max(
    0,
    Math.min(dragOverCm.yCm, room.depthCm - draggedBox.sizeD),
  );

  const nearbyBoxes = useMemo(
    () => getNearbyPlacedBoxes(xCm, yCm, draggedBox, placedBoxes),
    [xCm, yCm, draggedBox, placedBoxes],
  );

  const { conflict, inForbiddenZone, onPartition, stackLabel } = useMemo(() => {
    const restZ = computeRestingZ(
      xCm,
      yCm,
      draggedBox,
      nearbyBoxes,
      partitions,
    );
    const roomHeightOk = restZ + draggedBox.sizeH <= room.heightCm;
    const forbidden = overlapsZone(xCm, yCm, draggedBox, forbiddenZone);
    const partition = overlapsPartitionFootprint(
      xCm,
      yCm,
      draggedBox,
      partitions,
    );
    const hasConflict =
      !roomHeightOk ||
      partition ||
      (!forbidden &&
        has3DConflict(xCm, yCm, restZ, draggedBox, nearbyBoxes, partitions));
    return {
      conflict: hasConflict,
      inForbiddenZone: forbidden,
      onPartition: partition,
      stackLabel:
        hideStackLabel || hasConflict || forbidden || restZ <= 0
          ? null
          : `↑${Math.round(restZ + draggedBox.sizeH)} см`,
    };
  }, [
    xCm,
    yCm,
    draggedBox,
    nearbyBoxes,
    forbiddenZone,
    partitions,
    room.heightCm,
    hideStackLabel,
  ]);

  const tone = conflict
    ? ghostTone.conflict
    : stackLabel
      ? ghostTone.stack
      : ghostTone.default;

  const leftPct = (xCm / room.widthCm) * 100;
  const topPct = (yCm / room.depthCm) * 100;
  const widthPct = (draggedBox.sizeW / room.widthCm) * 100;
  const heightPct = (draggedBox.sizeD / room.depthCm) * 100;

  return (
    <div
      className={cn(
        "absolute z-50 pointer-events-none rounded-md ring-2 ring-dashed transition-none isolate flex items-center justify-center opacity-75 dark:opacity-95",
        tone.bg,
        tone.ring,
      )}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
        contain: "layout style paint",
      }}
    >
      {stackLabel && (
        <span className="text-[10px] font-bold text-green-700 dark:text-green-300 bg-green-100/80 dark:bg-green-950/60 px-1 rounded leading-none select-none">
          {stackLabel}
        </span>
      )}
      {inForbiddenZone && (
        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950/60 px-1 rounded leading-tight text-center select-none">
          В стопку
        </span>
      )}
      {!inForbiddenZone && onPartition && (
        <span className="text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100/80 dark:bg-red-950/60 px-1 rounded leading-tight text-center select-none">
          Перегородка
        </span>
      )}
    </div>
  );
});
