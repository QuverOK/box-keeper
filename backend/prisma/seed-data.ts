import type { Prisma } from "../src/generated/prisma/client";

export const SEED_USER = {
  email: process.env.SEED_USER_EMAIL ?? "test@boxkeeper.local",
  password: process.env.SEED_USER_PASSWORD ?? "Test1234!",
  name: process.env.SEED_USER_NAME ?? "Demo User",
};

export const MAX_ROOM_WIDTH_M = 30;
export const MAX_ROOM_DEPTH_M = 30;
export const MAX_ROOM_HEIGHT_M = 5;
export const MIN_BOX_DIMENSION_CM = 1;

export interface BoxSizes {
  sizeW: number;
  sizeD: number;
  sizeH: number;
}

export interface BoxPosition {
  posX: number;
  posY: number;
  posZ: number;
}

export interface SeedItemInput {
  name: string;
  category: string;
  description?: string;
}

export function makeQrCode(storageSlug: string, boxSlug: string): string {
  return `SEED-${storageSlug}-${boxSlug}`;
}

export function boxPlaced(
  storageSlug: string,
  boxSlug: string,
  name: string,
  sizes: BoxSizes,
  pos: BoxPosition,
  opts?: {
    color?: string;
    qrCode?: string;
    items?: SeedItemInput[];
  },
): Prisma.BoxCreateWithoutStorageInput {
  return {
    name,
    color: opts?.color ?? "#e0f2fe",
    qrCode: opts?.qrCode ?? makeQrCode(storageSlug, boxSlug),
    ...sizes,
    ...pos,
    items: opts?.items?.length
      ? { create: opts.items.map((item) => ({ ...item })) }
      : undefined,
  };
}

export function boxUnplaced(
  storageSlug: string,
  boxSlug: string,
  name: string,
  sizes: BoxSizes,
  opts?: { color?: string; items?: SeedItemInput[] },
): Prisma.BoxCreateWithoutStorageInput {
  return {
    name,
    color: opts?.color ?? "#fef3c7",
    qrCode: makeQrCode(storageSlug, boxSlug),
    ...sizes,
    posX: null,
    posY: null,
    posZ: null,
    items: opts?.items?.length
      ? { create: opts.items.map((item) => ({ ...item })) }
      : undefined,
  };
}

export function stackAt(
  storageSlug: string,
  count: number,
  params: {
    x: number;
    y: number;
    sizeW: number;
    sizeD: number;
    sizeH: number;
    namePrefix: string;
    color?: string;
  },
): Prisma.BoxCreateWithoutStorageInput[] {
  const { x, y, sizeW, sizeD, sizeH, namePrefix, color = "#93c5fd" } = params;
  return Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    const slug = `${namePrefix.toLowerCase()}-${String(index).padStart(2, "0")}`;
    return boxPlaced(
      storageSlug,
      slug,
      `${namePrefix}-${String(index).padStart(2, "0")}`,
      { sizeW, sizeD, sizeH },
      { posX: x, posY: y, posZ: i * sizeH },
      { color },
    );
  });
}

export function buildDemoSearchStorage(): Prisma.StorageCreateWithoutUserInput {
  const slug = "demo";
  const stackA = stackAt(slug, 3, {
    x: 80,
    y: 80,
    sizeW: 50,
    sizeD: 40,
    sizeH: 25,
    namePrefix: "StackA",
    color: "#bfdbfe",
  });
  const stackB = stackAt(slug, 2, {
    x: 350,
    y: 120,
    sizeW: 45,
    sizeD: 45,
    sizeH: 30,
    namePrefix: "StackB",
    color: "#c4b5fd",
  });
  const roomWcm = 600;
  const roomDcm = 500;
  const edgeBoxW = 60;
  const edgeBoxD = 50;

  return {
    name: "Демо: поиск и UI",
    roomWidth: 6,
    roomDepth: 5,
    roomHeight: 2.5,
    boxes: {
      create: [
        boxPlaced(slug, "alpha", "Alpha-коробка", { sizeW: 60, sizeD: 50, sizeH: 40 }, { posX: 200, posY: 150, posZ: 0 }, {
          color: "#fca5a5",
        }),
        boxPlaced(
          slug,
          "beta",
          "Beta-инструменты",
          { sizeW: 55, sizeD: 45, sizeH: 35 },
          { posX: 320, posY: 200, posZ: 0 },
          {
            color: "#fdba74",
            items: [
              { name: "Отвёртка", category: "Инструменты", description: "Крестовая PH2" },
              { name: "Молоток", category: "Инструменты" },
            ],
          },
        ),
        boxPlaced(
          slug,
          "gamma",
          "Gamma-документы",
          { sizeW: 50, sizeD: 40, sizeH: 30 },
          { posX: 450, posY: 280, posZ: 0 },
          {
            color: "#86efac",
            items: [
              {
                name: "Папка А4",
                category: "Документы",
                description: "архивный документ 2024",
              },
            ],
          },
        ),
        boxPlaced(slug, "delta", "Delta-пустая", { sizeW: 40, sizeD: 40, sizeH: 30 }, { posX: 150, posY: 350, posZ: 0 }, {
          color: "#d1d5db",
        }),
        boxPlaced(
          slug,
          "epsilon",
          "Epsilon-QR",
          { sizeW: 50, sizeD: 45, sizeH: 35 },
          { posX: 400, posY: 80, posZ: 0 },
          { color: "#fde047", qrCode: "SEED-QR-DEMO" },
        ),
        boxPlaced(
          slug,
          "many-items",
          "Zeta-много-вещей",
          { sizeW: 70, sizeD: 55, sizeH: 40 },
          { posX: 250, posY: 320, posZ: 0 },
          {
            color: "#a5b4fc",
            items: [
              { name: "Кабель HDMI", category: "Электроника" },
              { name: "Блокнот", category: "Канцелярия" },
              { name: "Ручка", category: "Канцелярия" },
              { name: "Фонарик", category: "Инструменты" },
              { name: "Батарейки", category: "Электроника", description: "AA комплект" },
              { name: "Скотч", category: "Канцелярия" },
            ],
          },
        ),
        boxPlaced(
          slug,
          "edge",
          "Edge-у-края",
          { sizeW: edgeBoxW, sizeD: edgeBoxD, sizeH: 35 },
          { posX: roomWcm - edgeBoxW, posY: roomDcm - edgeBoxD, posZ: 0 },
          { color: "#f9a8d4" },
        ),
        ...stackA,
        ...stackB,
      ],
    },
  };
}

export function buildStack50Storage(): Prisma.StorageCreateWithoutUserInput {
  const slug = "stack50";
  return {
    name: "Стопка ×50",
    roomWidth: 6,
    roomDepth: 6,
    roomHeight: 12,
    boxes: {
      create: stackAt(slug, 50, {
        x: 200,
        y: 200,
        sizeW: 60,
        sizeD: 40,
        sizeH: 20,
        namePrefix: "Stack",
        color: "#93c5fd",
      }),
    },
  };
}

export function buildMinStorage(): Prisma.StorageCreateWithoutUserInput {
  const slug = "min";
  return {
    name: "Мин. хранилище",
    roomWidth: 0.1,
    roomDepth: 0.1,
    roomHeight: 0.1,
    boxes: {
      create: [
        boxPlaced(
          slug,
          "min-box",
          "Min-1x1x1",
          { sizeW: MIN_BOX_DIMENSION_CM, sizeD: MIN_BOX_DIMENSION_CM, sizeH: MIN_BOX_DIMENSION_CM },
          { posX: 0, posY: 0, posZ: 0 },
          { color: "#bbf7d0" },
        ),
      ],
    },
  };
}

export function buildMaxStorage(): Prisma.StorageCreateWithoutUserInput {
  const slug = "max";
  const roomWcm = MAX_ROOM_WIDTH_M * 100;
  const roomDcm = MAX_ROOM_DEPTH_M * 100;
  const roomHcm = MAX_ROOM_HEIGHT_M * 100;
  return {
    name: "Макс. хранилище",
    roomWidth: MAX_ROOM_WIDTH_M,
    roomDepth: MAX_ROOM_DEPTH_M,
    roomHeight: MAX_ROOM_HEIGHT_M,
    boxes: {
      create: [
        boxPlaced(
          slug,
          "max-box",
          "Max-коробка",
          { sizeW: roomWcm, sizeD: roomDcm, sizeH: roomHcm },
          { posX: 0, posY: 0, posZ: 0 },
          { color: "#fca5a5" },
        ),
      ],
    },
  };
}

export function buildLayoutStorage(): Prisma.StorageCreateWithoutUserInput {
  const slug = "layout";
  return {
    name: "Layout: перегородки и метки",
    roomWidth: 8,
    roomDepth: 6,
    roomHeight: 3,
    boxes: {
      create: [
        boxPlaced(slug, "l1", "Layout-1", { sizeW: 60, sizeD: 50, sizeH: 40 }, { posX: 100, posY: 100, posZ: 0 }, {
          color: "#bfdbfe",
        }),
        boxPlaced(slug, "l2", "Layout-2", { sizeW: 55, sizeD: 45, sizeH: 35 }, { posX: 350, posY: 120, posZ: 0 }, {
          color: "#c4b5fd",
        }),
        boxPlaced(slug, "l3", "Layout-3", { sizeW: 50, sizeD: 50, sizeH: 30 }, { posX: 500, posY: 350, posZ: 0 }, {
          color: "#86efac",
        }),
        boxPlaced(slug, "l4", "Layout-4", { sizeW: 45, sizeD: 40, sizeH: 35 }, { posX: 650, posY: 200, posZ: 0 }, {
          color: "#fde047",
        }),
      ],
    },
    partitions: {
      create: [
        { x: 400, y: 0, z: 0, width: 10, depth: 600, height: 300, label: "Стена A" },
        { x: 0, y: 250, z: 0, width: 800, depth: 10, height: 300, label: "Стена B" },
      ],
    },
    layoutLabels: {
      create: [
        { x: 120, y: 60, text: "Зона A", fontSize: 14 },
        { x: 520, y: 420, text: "Полка 1", fontSize: 12 },
      ],
    },
  };
}

export function buildStagingStorage(): Prisma.StorageCreateWithoutUserInput {
  const slug = "staging";
  return {
    name: "Неразмещённые коробки",
    roomWidth: 4,
    roomDepth: 4,
    roomHeight: 2.5,
    boxes: {
      create: [
        boxUnplaced(slug, "u1", "Unplaced-1", { sizeW: 50, sizeD: 40, sizeH: 30 }),
        boxUnplaced(slug, "u2", "Unplaced-2", { sizeW: 45, sizeD: 45, sizeH: 35 }, { color: "#fdba74" }),
        boxUnplaced(slug, "u3", "Unplaced-3", { sizeW: 40, sizeD: 40, sizeH: 25 }, { color: "#c4b5fd" }),
        boxPlaced(slug, "placed", "Placed-1", { sizeW: 55, sizeD: 45, sizeH: 35 }, { posX: 150, posY: 150, posZ: 0 }, {
          color: "#86efac",
        }),
      ],
    },
  };
}

export const ALL_STORAGES: Prisma.StorageCreateWithoutUserInput[] = [
  buildDemoSearchStorage(),
  buildStack50Storage(),
  buildMinStorage(),
  buildMaxStorage(),
  buildLayoutStorage(),
  buildStagingStorage(),
];

export const SEED_SUMMARY = {
  storages: ALL_STORAGES.map((s) => s.name),
  searchHints: [
    { query: "alpha", target: "Alpha-коробка (по имени коробки)" },
    { query: "отвёртка", target: "Beta-инструменты (по имени вещи)" },
    { query: "инструменты", target: "Beta-инструменты (по категории)" },
    { query: "архивный", target: "Gamma-документы (по описанию)" },
    { query: "2024", target: "Gamma-документы (по описанию)" },
  ],
  qrCode: "SEED-QR-DEMO",
};
