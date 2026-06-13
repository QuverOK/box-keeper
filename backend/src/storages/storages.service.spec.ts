import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException, ConflictException, } from "@nestjs/common";
import { StoragesService } from "./storages.service";
import { PrismaService } from "../prisma/prisma.service";
const mockStorage = {
    id: "storage-1",
    name: "Гараж",
    roomWidth: 6,
    roomDepth: 5,
    roomHeight: 2.5,
    gridSizeX: 5,
    gridSizeY: 4,
    gridSizeZ: 3,
    userId: "user-1",
    createdAt: new Date(),
    boxes: [],
};
const mockPrisma = {
    storage: {
        create: jest.fn().mockResolvedValue(mockStorage),
        findMany: jest.fn().mockResolvedValue([mockStorage]),
        findUnique: jest.fn().mockResolvedValue(mockStorage),
        update: jest
            .fn()
            .mockResolvedValue({ ...mockStorage, name: "Обновлённый" }),
        delete: jest.fn().mockResolvedValue(mockStorage),
    },
};
describe("StoragesService", () => {
    let service: StoragesService;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StoragesService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        service = module.get<StoragesService>(StoragesService);
    });
    it("should be defined", () => {
        expect(service).toBeDefined();
    });
    it("creates a storage", async () => {
        const result = await service.create("user-1", {
            name: "Гараж",
            roomWidth: 6,
            roomDepth: 5,
            roomHeight: 2.5,
        });
        expect(result.name).toBe("Гараж");
        expect(mockPrisma.storage.create).toHaveBeenCalled();
    });
    it("returns all storages for user", async () => {
        const result = await service.findAll("user-1");
        expect(Array.isArray(result)).toBe(true);
        expect(result[0].userId).toBe("user-1");
    });
    it("finds a storage by id for the owner", async () => {
        const result = await service.findOne("storage-1", "user-1");
        expect(result.id).toBe("storage-1");
    });
    it("throws ForbiddenException if storage belongs to another user", async () => {
        await expect(service.findOne("storage-1", "other-user")).rejects.toThrow(ForbiddenException);
    });
    it("throws NotFoundException if storage does not exist", async () => {
        mockPrisma.storage.findUnique.mockResolvedValueOnce(null);
        await expect(service.findOne("missing", "user-1")).rejects.toThrow(NotFoundException);
    });
    it("updates a storage", async () => {
        const result = await service.update("storage-1", "user-1", {
            name: "Обновлённый",
        });
        expect(result.name).toBe("Обновлённый");
    });
    it("throws ConflictException when shrinking room below existing box size", async () => {
        mockPrisma.storage.findUnique.mockResolvedValueOnce({
            ...mockStorage,
            boxes: [{ id: "box-1", sizeW: 700, sizeD: 80, sizeH: 40 }],
        });
        await expect(service.update("storage-1", "user-1", { roomWidth: 3 })).rejects.toThrow(ConflictException);
    });
    it("removes a storage", async () => {
        const result = await service.remove("storage-1", "user-1");
        expect(result.id).toBe("storage-1");
    });
});
