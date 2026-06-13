import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Partition } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StoragesService } from "../storages/storages.service";
import { CreatePartitionDto } from "./dto/create-partition.dto";
import { UpdatePartitionDto } from "./dto/update-partition.dto";
@Injectable()
export class PartitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storagesService: StoragesService,
  ) {}
  private assertFitsStorage(
    dto: {
      x: number;
      y: number;
      z: number;
      width: number;
      depth: number;
      height: number;
    },
    storage: {
      roomWidth: number;
      roomDepth: number;
      roomHeight: number;
    },
  ): void {
    const roomWcm = storage.roomWidth * 100;
    const roomDcm = storage.roomDepth * 100;
    const roomHcm = storage.roomHeight * 100;
    if (
      dto.x < 0 ||
      dto.y < 0 ||
      dto.z < 0 ||
      dto.x + dto.width > roomWcm ||
      dto.y + dto.depth > roomDcm ||
      dto.z + dto.height > roomHcm
    ) {
      throw new ConflictException("Перегородка выходит за пределы помещения");
    }
  }
  async create(
    storageId: string,
    userId: string,
    dto: CreatePartitionDto,
  ): Promise<Partition> {
    const storage = await this.storagesService.findOne(storageId, userId);
    this.assertFitsStorage(dto, storage);
    return this.prisma.partition.create({
      data: { ...dto, storageId },
    });
  }
  async findAll(storageId: string, userId: string): Promise<Partition[]> {
    await this.storagesService.findOne(storageId, userId);
    return this.prisma.partition.findMany({
      where: { storageId },
      orderBy: { createdAt: "asc" },
    });
  }
  async update(
    id: string,
    userId: string,
    dto: UpdatePartitionDto,
  ): Promise<Partition> {
    const existing = await this.prisma.partition.findUnique({
      where: { id },
      include: { storage: true },
    });
    if (!existing) throw new NotFoundException("Перегородка не найдена");
    await this.storagesService.findOne(existing.storageId, userId);
    const merged = {
      x: dto.x ?? existing.x,
      y: dto.y ?? existing.y,
      z: dto.z ?? existing.z,
      width: dto.width ?? existing.width,
      depth: dto.depth ?? existing.depth,
      height: dto.height ?? existing.height,
    };
    this.assertFitsStorage(merged, existing.storage);
    return this.prisma.partition.update({ where: { id }, data: dto });
  }
  async remove(id: string, userId: string): Promise<Partition> {
    const existing = await this.prisma.partition.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Перегородка не найдена");
    await this.storagesService.findOne(existing.storageId, userId);
    return this.prisma.partition.delete({ where: { id } });
  }
}
