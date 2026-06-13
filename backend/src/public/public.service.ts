import { Injectable, NotFoundException } from "@nestjs/common";
import { Item, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface PublicBoxResponse {
  box: {
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
    createdAt: Date;
    items: Item[];
  };
  storage: {
    id: string;
    name: string;
  };
}

type PublicStorage = Prisma.StorageGetPayload<{
  include: {
    boxes: {
      include: { items: true };
    };
  };
}> & { userId?: never };

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}
  async findBoxByQrCode(qrCode: string): Promise<PublicBoxResponse> {
    const box = await this.prisma.box.findUnique({
      where: { qrCode },
      include: {
        items: true,
        storage: {
          select: { id: true, name: true },
        },
      },
    });
    if (!box) {
      throw new NotFoundException("Коробка не найдена");
    }
    return {
      box: {
        id: box.id,
        name: box.name,
        color: box.color,
        qrCode: box.qrCode,
        sizeW: box.sizeW,
        sizeD: box.sizeD,
        sizeH: box.sizeH,
        posX: box.posX,
        posY: box.posY,
        posZ: box.posZ,
        storageId: box.storageId,
        createdAt: box.createdAt,
        items: box.items,
      },
      storage: box.storage,
    };
  }
  async findStoragePublic(id: string): Promise<Omit<PublicStorage, "userId">> {
    const storage = await this.prisma.storage.findUnique({
      where: { id },
      include: {
        boxes: {
          include: { items: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!storage) {
      throw new NotFoundException("Хранилище не найдено");
    }
    const { userId: _userId, ...publicStorage } = storage;
    return publicStorage;
  }
}
