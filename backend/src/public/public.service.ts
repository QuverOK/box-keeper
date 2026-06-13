import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class PublicService {
    constructor(private readonly prisma: PrismaService) { }
    async findBoxByQrCode(qrCode: string) {
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
    async findStoragePublic(id: string) {
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
