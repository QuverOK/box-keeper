export interface BoxDims {
  id: string;
  sizeW: number;
  sizeD: number;
  sizeH: number;
}
export interface PlacedBoxDims extends BoxDims {
  x: number;
  y: number;
  z: number;
}
export interface PartitionDims {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}
function footprintOverlapArea(
  x: number,
  y: number,
  box: BoxDims,
  ox: number,
  oy: number,
  ow: number,
  od: number,
): number {
  const overlapW = Math.max(
    0,
    Math.min(x + box.sizeW, ox + ow) - Math.max(x, ox),
  );
  const overlapD = Math.max(
    0,
    Math.min(y + box.sizeD, oy + od) - Math.max(y, oy),
  );
  return overlapW * overlapD;
}
export function overlapsPartitionFootprint(
  x: number,
  y: number,
  box: BoxDims,
  partitions: PartitionDims[],
): boolean {
  return partitions.some(
    (p) => footprintOverlapArea(x, y, box, p.x, p.y, p.width, p.depth) > 0,
  );
}
export function isInPartitionGap(
  x: number,
  y: number,
  box: BoxDims,
  partitions: PartitionDims[],
): boolean {
  for (let i = 0; i < partitions.length; i++) {
    for (let j = i + 1; j < partitions.length; j++) {
      const a = partitions[i];
      const b = partitions[j];
      const yOverlap = Math.max(
        0,
        Math.min(y + box.sizeD, Math.max(a.y + a.depth, b.y + b.depth)) -
          Math.max(y, Math.min(a.y, b.y)),
      );
      if (yOverlap <= 0) continue;
      const left = a.x <= b.x ? a : b;
      const right = a.x <= b.x ? b : a;
      const gapStart = left.x + left.width;
      const gapEnd = right.x;
      const gapWidth = gapEnd - gapStart;
      if (gapWidth <= 0 || gapWidth >= box.sizeW) continue;
      if (x + box.sizeW > gapStart && x < gapEnd) return true;
    }
  }
  return false;
}
export function computeRestingZ(
  x: number,
  y: number,
  box: BoxDims,
  placedBoxes: PlacedBoxDims[],
  partitions: PartitionDims[] = [],
  maxSupportZ?: number,
): number {
  void partitions;
  const others = placedBoxes.filter((b) => b.id !== box.id);
  const boxArea = box.sizeW * box.sizeD;
  const surfaces = new Map<number, number>();
  for (const b of others) {
    const area = footprintOverlapArea(x, y, box, b.x, b.y, b.sizeW, b.sizeD);
    if (area > 0) {
      const top = b.z + b.sizeH;
      if (maxSupportZ !== undefined && top > maxSupportZ) continue;
      surfaces.set(top, (surfaces.get(top) ?? 0) + area);
    }
  }
  let bestZ = 0;
  surfaces.forEach((area, surfZ) => {
    if (area / boxArea >= 0.6) {
      bestZ = Math.max(bestZ, surfZ);
    }
  });
  return bestZ;
}
export interface XYZone {
  x: number;
  y: number;
  w: number;
  d: number;
}
export function overlapsZone(
  x: number,
  y: number,
  box: BoxDims,
  zone: XYZone | null | undefined,
): boolean {
  if (!zone) return false;
  const xOk = x < zone.x + zone.w && x + box.sizeW > zone.x;
  const yOk = y < zone.y + zone.d && y + box.sizeD > zone.y;
  return xOk && yOk;
}
export function has3DConflict(
  x: number,
  y: number,
  z: number,
  box: BoxDims,
  placedBoxes: PlacedBoxDims[],
  partitions: PartitionDims[] = [],
): boolean {
  const boxConflict = placedBoxes.some((b) => {
    if (b.id === box.id) return false;
    const xOk = x < b.x + b.sizeW && x + box.sizeW > b.x;
    const yOk = y < b.y + b.sizeD && y + box.sizeD > b.y;
    const zOk = z < b.z + b.sizeH && z + box.sizeH > b.z;
    return xOk && yOk && zOk;
  });
  if (boxConflict) return true;
  return partitions.some((p) => {
    const xOk = x < p.x + p.width && x + box.sizeW > p.x;
    const yOk = y < p.y + p.depth && y + box.sizeD > p.y;
    const zOk = z < p.z + p.height && z + box.sizeH > p.z;
    return xOk && yOk && zOk;
  });
}
export interface BoxStack {
  boxes: PlacedBoxDims[];
  topBoxId: string;
}
function xyOverlapArea(a: PlacedBoxDims, b: PlacedBoxDims): number {
  const ow = Math.max(
    0,
    Math.min(a.x + a.sizeW, b.x + b.sizeW) - Math.max(a.x, b.x),
  );
  const od = Math.max(
    0,
    Math.min(a.y + a.sizeD, b.y + b.sizeD) - Math.max(a.y, b.y),
  );
  return ow * od;
}
const STACK_Z_EPSILON_CM = 0.5;
function areVerticallyAdjacent(a: PlacedBoxDims, b: PlacedBoxDims): boolean {
  const aTop = a.z + a.sizeH;
  const bTop = b.z + b.sizeH;
  return (
    Math.abs(aTop - b.z) <= STACK_Z_EPSILON_CM ||
    Math.abs(bTop - a.z) <= STACK_Z_EPSILON_CM
  );
}
export function computeStacks(placedBoxes: PlacedBoxDims[]): BoxStack[] {
  const n = placedBoxes.length;
  const parent = placedBoxes.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    while (parent[i] !== root) {
      const next = parent[i];
      parent[i] = root;
      i = next;
    }
    return root;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = placedBoxes[i];
      const b = placedBoxes[j];
      const overlap = xyOverlapArea(a, b);
      if (overlap <= 0) continue;
      const minArea = Math.min(a.sizeW * a.sizeD, b.sizeW * b.sizeD);
      if (
        minArea > 0 &&
        overlap / minArea >= 0.6 &&
        areVerticallyAdjacent(a, b)
      )
        union(i, j);
    }
  }
  const groups = new Map<number, PlacedBoxDims[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const arr = groups.get(root) ?? [];
    arr.push(placedBoxes[i]);
    groups.set(root, arr);
  }
  const stacks: BoxStack[] = [];
  groups.forEach((boxes) => {
    if (boxes.length < 2) return;
    const sorted = [...boxes].sort((a, b) => a.z - b.z);
    let topBoxId = sorted[0].id;
    let topVal = -Infinity;
    for (const b of sorted) {
      const top = b.z + b.sizeH;
      if (top > topVal) {
        topVal = top;
        topBoxId = b.id;
      }
    }
    stacks.push({ boxes: sorted, topBoxId });
  });
  return stacks;
}
export function computeSettleUpdates(
  movedBoxOldPos: PlacedBoxDims,
  newPlacedBoxes: PlacedBoxDims[],
  partitions: PartitionDims[] = [],
): Array<{
  id: string;
  x: number;
  y: number;
  z: number;
}> {
  const affected = newPlacedBoxes.filter((b) => {
    const xOk =
      b.x < movedBoxOldPos.x + movedBoxOldPos.sizeW &&
      b.x + b.sizeW > movedBoxOldPos.x;
    const yOk =
      b.y < movedBoxOldPos.y + movedBoxOldPos.sizeD &&
      b.y + b.sizeD > movedBoxOldPos.y;
    return xOk && yOk && b.z > movedBoxOldPos.z;
  });
  if (affected.length === 0) return [];
  affected.sort((a, b) => a.z - b.z);
  const settledList = [...newPlacedBoxes];
  const updates: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
  }> = [];
  for (const ab of affected) {
    const newZ = computeRestingZ(ab.x, ab.y, ab, settledList, partitions, ab.z);
    if (Math.abs(newZ - ab.z) > STACK_Z_EPSILON_CM) {
      updates.push({ id: ab.id, x: ab.x, y: ab.y, z: newZ });
      const idx = settledList.findIndex((b) => b.id === ab.id);
      if (idx >= 0) settledList[idx] = { ...ab, z: newZ };
    }
  }
  return updates;
}
export function findNearestValidXY(
  desiredX: number,
  desiredY: number,
  box: BoxDims,
  placedBoxes: PlacedBoxDims[],
  room: {
    widthCm: number;
    depthCm: number;
    heightCm: number;
  },
  forbiddenZone?: XYZone | null,
  partitions: PartitionDims[] = [],
): {
  x: number;
  y: number;
  z: number;
} | null {
  const tryPos = (
    rx: number,
    ry: number,
  ): {
    x: number;
    y: number;
    z: number;
  } | null => {
    const cx = Math.max(0, Math.min(rx, room.widthCm - box.sizeW));
    const cy = Math.max(0, Math.min(ry, room.depthCm - box.sizeD));
    if (overlapsZone(cx, cy, box, forbiddenZone)) return null;
    if (isInPartitionGap(cx, cy, box, partitions)) return null;
    if (overlapsPartitionFootprint(cx, cy, box, partitions)) return null;
    const z = computeRestingZ(cx, cy, box, placedBoxes, partitions);
    if (z + box.sizeH > room.heightCm) return null;
    if (has3DConflict(cx, cy, z, box, placedBoxes, partitions)) return null;
    return { x: cx, y: cy, z };
  };
  const exact = tryPos(desiredX, desiredY);
  if (exact) return exact;
  const cDesiredX = Math.max(0, Math.min(desiredX, room.widthCm - box.sizeW));
  const cDesiredY = Math.max(0, Math.min(desiredY, room.depthCm - box.sizeD));
  const blocking = placedBoxes.filter((b) => {
    if (b.id === box.id) return false;
    const xOk = cDesiredX < b.x + b.sizeW && cDesiredX + box.sizeW > b.x;
    const yOk = cDesiredY < b.y + b.sizeD && cDesiredY + box.sizeD > b.y;
    return xOk && yOk;
  });
  if (blocking.length > 0) {
    const clusterX = Math.min(...blocking.map((b) => b.x));
    const clusterY = Math.min(...blocking.map((b) => b.y));
    const clusterXEnd = Math.max(...blocking.map((b) => b.x + b.sizeW));
    const clusterYEnd = Math.max(...blocking.map((b) => b.y + b.sizeD));
    const edgeCandidates: [number, number][] = [
      [clusterXEnd, desiredY],
      [clusterX - box.sizeW, desiredY],
      [desiredX, clusterYEnd],
      [desiredX, clusterY - box.sizeD],
    ];
    edgeCandidates.sort(
      (ca, cb) =>
        Math.hypot(ca[0] - desiredX, ca[1] - desiredY) -
        Math.hypot(cb[0] - desiredX, cb[1] - desiredY),
    );
    for (const [ex, ey] of edgeCandidates) {
      const result = tryPos(ex, ey);
      if (result) return result;
    }
  }
  for (let radius = 5; radius <= 200; radius += 5) {
    const numAngles = Math.max(8, Math.round((2 * Math.PI * radius) / 5));
    for (let i = 0; i < numAngles; i++) {
      const angle = (i / numAngles) * 2 * Math.PI;
      const result = tryPos(
        desiredX + radius * Math.cos(angle),
        desiredY + radius * Math.sin(angle),
      );
      if (result) return result;
    }
  }
  return null;
}
