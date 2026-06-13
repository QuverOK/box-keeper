// Domain types mirroring the Prisma schema.
// These are the source of truth for the entities layer.

/** Maximum storage room dimensions in metres. */
export const MAX_ROOM_WIDTH = 30;
export const MAX_ROOM_DEPTH = 30;
export const MAX_ROOM_HEIGHT = 5;

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface Storage {
  id: string;
  name: string;
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  gridSizeX: number;
  gridSizeY: number;
  gridSizeZ: number;
  userId: string;
  createdAt: string;
  boxes?: Box[];
  partitions?: Partition[];
  layoutLabels?: LayoutLabel[];
}

export interface Partition {
  id: string;
  storageId: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  label: string | null;
  createdAt: string;
}

export interface LayoutLabel {
  id: string;
  storageId: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  createdAt: string;
}

export interface Box {
  id: string;
  name: string;
  color: string;
  qrCode: string;
  sizeW: number;
  sizeD: number;
  sizeH: number;
  posX: number | null;
  posY: number | null;
  posZ: number | null;
  storageId: string;
  createdAt: string;
  items?: Item[];
}

export interface Item {
  id: string;
  name: string;
  category: string;
  description: string | null;
  photo: string | null;
  boxId: string;
  createdAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
