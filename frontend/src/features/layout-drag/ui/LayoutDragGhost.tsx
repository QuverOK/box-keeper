import type { LayoutRoom } from "../model/clamp";
import { clampLabelXY, clampPartitionXY } from "../model/clamp";
interface LayoutDragGhostProps {
  kind: "partition" | "label";
  text?: string;
  width: number;
  depth: number;
  dragOverCm: {
    xCm: number;
    yCm: number;
  };
  room: LayoutRoom;
}
export function LayoutDragGhost({
  kind,
  text,
  width,
  depth,
  dragOverCm,
  room,
}: LayoutDragGhostProps) {
  const pos =
    kind === "partition"
      ? clampPartitionXY(dragOverCm.xCm, dragOverCm.yCm, width, depth, room)
      : clampLabelXY(dragOverCm.xCm, dragOverCm.yCm, room);
  if (kind === "partition") {
    return (
      <div
        className="absolute pointer-events-none border-2 border-dashed border-slate-600 bg-slate-400/30 rounded-sm z-50"
        style={{
          left: `${(pos.xCm / room.widthCm) * 100}%`,
          top: `${(pos.yCm / room.depthCm) * 100}%`,
          width: `${(width / room.widthCm) * 100}%`,
          height: `${(depth / room.depthCm) * 100}%`,
        }}
      />
    );
  }
  return (
    <div
      className="absolute pointer-events-none text-foreground/70 font-medium whitespace-nowrap z-50 outline outline-2 outline-dashed outline-primary/40 rounded px-1"
      style={{
        left: `${(pos.xCm / room.widthCm) * 100}%`,
        top: `${(pos.yCm / room.depthCm) * 100}%`,
      }}
    >
      {text}
    </div>
  );
}
