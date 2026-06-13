export interface LayoutRoom {
  widthCm: number;
  depthCm: number;
}

export function clampPartitionXY(
  xCm: number,
  yCm: number,
  width: number,
  depth: number,
  room: LayoutRoom,
): { xCm: number; yCm: number } {
  return {
    xCm: Math.max(0, Math.min(xCm, room.widthCm - width)),
    yCm: Math.max(0, Math.min(yCm, room.depthCm - depth)),
  };
}

export function clampLabelXY(
  xCm: number,
  yCm: number,
  room: LayoutRoom,
): { xCm: number; yCm: number } {
  return {
    xCm: Math.max(0, Math.min(xCm, room.widthCm)),
    yCm: Math.max(0, Math.min(yCm, room.depthCm)),
  };
}
