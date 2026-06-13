import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { BoxesService } from "./boxes.service";
import { PrismaService } from "../prisma/prisma.service";
import { StoragesService } from "../storages/storages.service";

const mockStorage = {
  id: "storage-1",
  userId: "user-1",
  name: "Гараж",
  roomWidth: 6,
  roomDepth: 5,
  roomHeight: 2.5,
  gridSizeX: 5,
  gridSizeY: 4,
  gridSizeZ: 3,
  createdAt: new Date(),
  boxes: [],
};

const mockBox = {
  id: "box-1",
  name: "Инструменты",
  color: "#e0f2fe",
  qrCode: "BOX-storage-Инструменты-123",
  sizeW: 60,
  sizeD: 80,
  sizeH: 40,
  posX: null,
  posY: null,
  posZ: null,
  storageId: "storage-1",
  storage: mockStorage,
  items: [],
  createdAt: new Date(),
};

const mockPrisma = {
  box: {
    create: jest.fn().mockResolvedValue(mockBox),
    findMany: jest.fn().mockResolvedValue([mockBox]),
    findUnique: jest.fn().mockResolvedValue(mockBox),
    update: jest
      .fn()
      .mockResolvedValue({ ...mockBox, posX: 0, posY: 0, posZ: 0 }),
    delete: jest.fn().mockResolvedValue(mockBox),
  },
};

const mockStoragesService = {
  findOne: jest.fn().mockResolvedValue(mockStorage),
};

describe("BoxesService", () => {
  let service: BoxesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoxesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StoragesService, useValue: mockStoragesService },
      ],
    }).compile();

    service = module.get<BoxesService>(BoxesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("creates a box in a storage", async () => {
    const result = await service.create("storage-1", "user-1", {
      name: "Инструменты",
      sizeW: 60,
      sizeD: 80,
      sizeH: 40,
    });
    expect(result.name).toBe("Инструменты");
    expect(mockStoragesService.findOne).toHaveBeenCalledWith(
      "storage-1",
      "user-1",
    );
  });

  it("moves a box to a position", async () => {
    const result = await service.move("box-1", "user-1", {
      posX: 0,
      posY: 0,
      posZ: 0,
    });
    expect(result.posX).toBe(0);
    expect(result.posY).toBe(0);
    expect(result.posZ).toBe(0);
  });

  it("unplaces a box by passing null position", async () => {
    mockPrisma.box.update.mockResolvedValueOnce({
      ...mockBox,
      posX: null,
      posY: null,
      posZ: null,
    });
    const result = await service.move("box-1", "user-1", {});
    expect(result.posX).toBeNull();
  });

  it("throws NotFoundException when box not found", async () => {
    mockPrisma.box.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne("missing", "user-1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("removes a box", async () => {
    const result = await service.remove("box-1", "user-1");
    expect(result.id).toBe("box-1");
  });
});
