import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { Prisma, Storage } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStorageDto } from "./dto/create-storage.dto";
import { UpdateStorageDto } from "./dto/update-storage.dto";

export type StorageWithRelations = Prisma.StorageGetPayload<{
  include: {
    boxes: { include: { items: true } };
    partitions: true;
    layoutLabels: true;
  };
}>;

@Injectable()
export class StoragesService {
  constructor(private readonly prisma: PrismaService) {}
  private assertAllBoxesFitRoom(
    boxes: {
      sizeW: number;
      sizeD: number;
      sizeH: number;
    }[],
    storage: {
      roomWidth: number;
      roomDepth: number;
      roomHeight: number;
    },
  ): void {
    const roomWcm = storage.roomWidth * 100;
    const roomDcm = storage.roomDepth * 100;
    const roomHcm = storage.roomHeight * 100;
    const hasOversized = boxes.some(
      (box) =>
        box.sizeW > roomWcm || box.sizeD > roomDcm || box.sizeH > roomHcm,
    );
    if (hasOversized) {
      throw new ConflictException(
        "Невозможно изменить размеры: некоторые коробки превышают новые размеры хранилища",
      );
    }
  }
  async create(
    userId: string,
    dto: CreateStorageDto,
  ): Promise<StorageWithRelations> {
    return this.prisma.storage.create({
      data: { ...dto, userId },
      include: {
        boxes: { include: { items: true } },
        partitions: true,
        layoutLabels: true,
      },
    });
  }
  async findAll(userId: string): Promise<StorageWithRelations[]> {
    return this.prisma.storage.findMany({
      where: { userId },
      include: {
        boxes: { include: { items: true } },
        partitions: true,
        layoutLabels: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async findOne(id: string, userId: string): Promise<StorageWithRelations> {
    const storage = await this.prisma.storage.findUnique({
      where: { id },
      include: {
        boxes: { include: { items: true } },
        partitions: true,
        layoutLabels: true,
      },
    });
    if (!storage) throw new NotFoundException("Хранилище не найдено");
    if (storage.userId !== userId) throw new ForbiddenException();
    return storage;
  }
  async update(
    id: string,
    userId: string,
    dto: UpdateStorageDto,
  ): Promise<StorageWithRelations> {
    const storage = await this.findOne(id, userId);
    const nextRoom = {
      roomWidth: dto.roomWidth ?? storage.roomWidth,
      roomDepth: dto.roomDepth ?? storage.roomDepth,
      roomHeight: dto.roomHeight ?? storage.roomHeight,
    };
    const roomChanged =
      dto.roomWidth !== undefined ||
      dto.roomDepth !== undefined ||
      dto.roomHeight !== undefined;
    if (roomChanged) {
      this.assertAllBoxesFitRoom(storage.boxes, nextRoom);
    }
    return this.prisma.storage.update({
      where: { id },
      data: dto,
      include: {
        boxes: { include: { items: true } },
        partitions: true,
        layoutLabels: true,
      },
    });
  }
  async remove(id: string, userId: string): Promise<Storage> {
    await this.findOne(id, userId);
    return this.prisma.storage.delete({ where: { id } });
  }
}
