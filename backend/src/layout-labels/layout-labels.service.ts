import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StoragesService } from "../storages/storages.service";
import { CreateLayoutLabelDto } from "./dto/create-layout-label.dto";
import { UpdateLayoutLabelDto } from "./dto/update-layout-label.dto";
@Injectable()
export class LayoutLabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storagesService: StoragesService,
  ) {}
  private assertInRoom(
    x: number,
    y: number,
    storage: {
      roomWidth: number;
      roomDepth: number;
    },
  ) {
    const roomWcm = storage.roomWidth * 100;
    const roomDcm = storage.roomDepth * 100;
    if (x < 0 || y < 0 || x > roomWcm || y > roomDcm) {
      throw new ConflictException("Подпись выходит за пределы помещения");
    }
  }
  async create(storageId: string, userId: string, dto: CreateLayoutLabelDto) {
    const storage = await this.storagesService.findOne(storageId, userId);
    this.assertInRoom(dto.x, dto.y, storage);
    return this.prisma.layoutLabel.create({
      data: {
        storageId,
        x: dto.x,
        y: dto.y,
        text: dto.text,
        fontSize: dto.fontSize ?? 12,
      },
    });
  }
  async findAll(storageId: string, userId: string) {
    await this.storagesService.findOne(storageId, userId);
    return this.prisma.layoutLabel.findMany({
      where: { storageId },
      orderBy: { createdAt: "asc" },
    });
  }
  async update(id: string, userId: string, dto: UpdateLayoutLabelDto) {
    const existing = await this.prisma.layoutLabel.findUnique({
      where: { id },
      include: { storage: true },
    });
    if (!existing) throw new NotFoundException("Подпись не найдена");
    await this.storagesService.findOne(existing.storageId, userId);
    const x = dto.x ?? existing.x;
    const y = dto.y ?? existing.y;
    this.assertInRoom(x, y, existing.storage);
    return this.prisma.layoutLabel.update({ where: { id }, data: dto });
  }
  async remove(id: string, userId: string) {
    const existing = await this.prisma.layoutLabel.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Подпись не найдена");
    await this.storagesService.findOne(existing.storageId, userId);
    return this.prisma.layoutLabel.delete({ where: { id } });
  }
}
