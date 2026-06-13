import type { Box } from "@/shared/model";
export interface PlacedBox extends Box {
  posX: number;
  posY: number;
  posZ: number;
}
export function isPlaced(box: Box): box is PlacedBox {
  return box.posX !== null && box.posY !== null && box.posZ !== null;
}
export function computeRestingZ(
  newBox: {
    posX: number;
    posY: number;
    sizeW: number;
    sizeD: number;
    sizeH: number;
  },
  placedBoxes: PlacedBox[],
): number {
  const { posX, posY, sizeW, sizeD } = newBox;
  const newLeft = posX;
  const newRight = posX + sizeW;
  const newFront = posY;
  const newBack = posY + sizeD;
  let maxZ = 0;
  for (const box of placedBoxes) {
    const bLeft = box.posX;
    const bRight = box.posX + box.sizeW;
    const bFront = box.posY;
    const bBack = box.posY + box.sizeD;
    const overlapX = newLeft < bRight && newRight > bLeft;
    const overlapY = newFront < bBack && newBack > bFront;
    if (overlapX && overlapY) {
      const top = box.posZ + box.sizeH;
      if (top > maxZ) maxZ = top;
    }
  }
  return maxZ;
}
export function boxFitsInStorage(
  box: {
    posX: number;
    posY: number;
    posZ: number;
    sizeW: number;
    sizeD: number;
    sizeH: number;
  },
  room: {
    roomWidth: number;
    roomDepth: number;
    roomHeight: number;
  },
): boolean {
  const roomW = room.roomWidth * 100;
  const roomD = room.roomDepth * 100;
  const roomH = room.roomHeight * 100;
  return (
    box.posX + box.sizeW <= roomW &&
    box.posY + box.sizeD <= roomD &&
    box.posZ + box.sizeH <= roomH &&
    box.posX >= 0 &&
    box.posY >= 0 &&
    box.posZ >= 0
  );
}
