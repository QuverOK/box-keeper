import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { Box, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StoragesService } from "../storages/storages.service";
import { CreateBoxDto } from "./dto/create-box.dto";
import { UpdateBoxDto } from "./dto/update-box.dto";
import { MoveBoxDto } from "./dto/move-box.dto";

type BoxWithItems = Prisma.BoxGetPayload<{ include: { items: true } }>;
type BoxWithItemsAndStorage = Prisma.BoxGetPayload<{
  include: { items: true; storage: true };
}>;

function generateQrCode(storageId: string, boxName: string): string {
  const slug = boxName.replace(/\s+/g, "-").toUpperCase();
  return `BOX-${storageId.slice(0, 8)}-${slug}-${Date.now()}`;
}
@Injectable()
export class BoxesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storagesService: StoragesService,
  ) {}
  private async assertUniqueName(
    storageId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.box.findFirst({
      where: {
        storageId,
        name: { equals: name, mode: "insensitive" },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        "Коробка с таким названием уже существует в этом хранилище",
      );
    }
  }
  private assertBoxFitsRoom(
    sizeW: number,
    sizeD: number,
    sizeH: number,
    storage: {
      roomWidth: number;
      roomDepth: number;
      roomHeight: number;
    },
  ): void {
    const roomWcm = storage.roomWidth * 100;
    const roomDcm = storage.roomDepth * 100;
    const roomHcm = storage.roomHeight * 100;
    const errors: string[] = [];
    if (sizeW > roomWcm) errors.push("длина");
    if (sizeD > roomDcm) errors.push("ширина");
    if (sizeH > roomHcm) errors.push("высота");
    if (errors.length > 0) {
      throw new ConflictException(
        `Размер коробки превышает размеры помещения (${errors.join(", ")})`,
      );
    }
  }
  async create(
    storageId: string,
    userId: string,
    dto: CreateBoxDto,
  ): Promise<BoxWithItems> {
    const storage = await this.storagesService.findOne(storageId, userId);
    await this.assertUniqueName(storageId, dto.name);
    this.assertBoxFitsRoom(dto.sizeW, dto.sizeD, dto.sizeH, storage);
    const qrCode = generateQrCode(storageId, dto.name);
    return this.prisma.box.create({
      data: { ...dto, storageId, qrCode },
      include: { items: true },
    });
  }
  async findAll(storageId: string, userId: string): Promise<BoxWithItems[]> {
    await this.storagesService.findOne(storageId, userId);
    return this.prisma.box.findMany({
      where: { storageId },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });
  }
  async findOne(id: string, userId: string): Promise<BoxWithItemsAndStorage> {
    const box = await this.prisma.box.findUnique({
      where: { id },
      include: {
        items: true,
        storage: true,
      },
    });
    if (!box) throw new NotFoundException("Коробка не найдена");
    if (box.storage.userId !== userId) throw new ForbiddenException();
    return box;
  }
  async update(
    id: string,
    userId: string,
    dto: UpdateBoxDto,
  ): Promise<BoxWithItems> {
    const box = await this.findOne(id, userId);
    if (dto.name !== undefined) {
      await this.assertUniqueName(box.storageId, dto.name, id);
    }
    const sizeW = dto.sizeW ?? box.sizeW;
    const sizeD = dto.sizeD ?? box.sizeD;
    const sizeH = dto.sizeH ?? box.sizeH;
    this.assertBoxFitsRoom(sizeW, sizeD, sizeH, box.storage);
    return this.prisma.box.update({
      where: { id },
      data: dto,
      include: { items: true },
    });
  }
  async move(
    id: string,
    userId: string,
    dto: MoveBoxDto,
  ): Promise<BoxWithItems> {
    await this.findOne(id, userId);
    return this.prisma.box.update({
      where: { id },
      data: {
        posX: dto.posX ?? null,
        posY: dto.posY ?? null,
        posZ: dto.posZ ?? null,
      },
      include: { items: true },
    });
  }
  async remove(id: string, userId: string): Promise<Box> {
    await this.findOne(id, userId);
    return this.prisma.box.delete({ where: { id } });
  }
}
