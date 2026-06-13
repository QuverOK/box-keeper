import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Item, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { BoxesService } from "../boxes/boxes.service";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";

type ItemWithBoxAndStorage = Prisma.ItemGetPayload<{
  include: { box: { include: { storage: true } } };
}>;

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boxesService: BoxesService,
  ) {}
  async create(
    boxId: string,
    userId: string,
    dto: CreateItemDto,
  ): Promise<Item> {
    await this.boxesService.findOne(boxId, userId);
    return this.prisma.item.create({ data: { ...dto, boxId } });
  }
  async findAll(boxId: string, userId: string): Promise<Item[]> {
    await this.boxesService.findOne(boxId, userId);
    return this.prisma.item.findMany({
      where: { boxId },
      orderBy: { createdAt: "asc" },
    });
  }
  async findOne(id: string, userId: string): Promise<ItemWithBoxAndStorage> {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { box: { include: { storage: true } } },
    });
    if (!item) throw new NotFoundException("Предмет не найден");
    if (item.box.storage.userId !== userId) throw new ForbiddenException();
    return item;
  }
  async update(id: string, userId: string, dto: UpdateItemDto): Promise<Item> {
    await this.findOne(id, userId);
    return this.prisma.item.update({ where: { id }, data: dto });
  }
  async remove(id: string, userId: string): Promise<Item> {
    await this.findOne(id, userId);
    return this.prisma.item.delete({ where: { id } });
  }
}
