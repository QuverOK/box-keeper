export const DEFAULT_PART_WIDTH = 100;
export const DEFAULT_PART_DEPTH = 40;
export const DEFAULT_PART_HEIGHT = 5;
export const DEFAULT_LABEL_TEXT = "Текст";

export function centerPartitionXY(
  roomSize: { width: number; depth: number },
  width: number,
  depth: number,
) {
  const roomWcm = roomSize.width * 100;
  const roomDcm = roomSize.depth * 100;
  return {
    x: Math.max(0, (roomWcm - width) / 2),
    y: Math.max(0, (roomDcm - depth) / 2),
  };
}

export function centerLabelXY(roomSize: { width: number; depth: number }) {
  const roomWcm = roomSize.width * 100;
  const roomDcm = roomSize.depth * 100;
  return { x: roomWcm / 2, y: roomDcm / 2 };
}
