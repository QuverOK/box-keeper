import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ItemsService } from "./items.service";
import { PrismaService } from "../prisma/prisma.service";
import { BoxesService } from "../boxes/boxes.service";

const mockBox = {
  id: "box-1",
  name: "Инструменты",
  storage: { userId: "user-1" },
};

const mockItem = {
  id: "item-1",
  name: "Молоток",
  category: "Инструменты",
  description: null,
  photo: null,
  boxId: "box-1",
  box: mockBox,
  createdAt: new Date(),
};

const mockPrisma = {
  item: {
    create: jest.fn().mockResolvedValue(mockItem),
    findMany: jest.fn().mockResolvedValue([mockItem]),
    findUnique: jest.fn().mockResolvedValue(mockItem),
    update: jest.fn().mockResolvedValue({ ...mockItem, name: "Дрель" }),
    delete: jest.fn().mockResolvedValue(mockItem),
  },
};

const mockBoxesService = {
  findOne: jest.fn().mockResolvedValue(mockBox),
};

describe("ItemsService", () => {
  let service: ItemsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BoxesService, useValue: mockBoxesService },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("creates an item in a box", async () => {
    const result = await service.create("box-1", "user-1", {
      name: "Молоток",
      category: "Инструменты",
    });
    expect(result.name).toBe("Молоток");
    expect(mockBoxesService.findOne).toHaveBeenCalledWith("box-1", "user-1");
  });

  it("returns all items in a box", async () => {
    const result = await service.findAll("box-1", "user-1");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].boxId).toBe("box-1");
  });

  it("finds an item by id", async () => {
    const result = await service.findOne("item-1", "user-1");
    expect(result.id).toBe("item-1");
  });

  it("throws NotFoundException when item not found", async () => {
    mockPrisma.item.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne("missing", "user-1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("updates an item", async () => {
    const result = await service.update("item-1", "user-1", { name: "Дрель" });
    expect(result.name).toBe("Дрель");
  });

  it("removes an item", async () => {
    const result = await service.remove("item-1", "user-1");
    expect(result.id).toBe("item-1");
  });
});
