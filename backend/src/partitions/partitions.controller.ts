import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { Partition } from "@prisma/client";
import { PartitionsService } from "./partitions.service";
import { CreatePartitionDto } from "./dto/create-partition.dto";
import { UpdatePartitionDto } from "./dto/update-partition.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedRequest } from "../auth/auth-user";
@UseGuards(JwtAuthGuard)
@Controller()
export class PartitionsController {
  constructor(private readonly partitionsService: PartitionsService) {}
  @Post("storages/:storageId/partitions")
  create(
    @Param("storageId")
    storageId: string,
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: CreatePartitionDto,
  ): Promise<Partition> {
    return this.partitionsService.create(storageId, req.user.id, dto);
  }
  @Get("storages/:storageId/partitions")
  findAll(
    @Param("storageId")
    storageId: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<Partition[]> {
    return this.partitionsService.findAll(storageId, req.user.id);
  }
  @Patch("partitions/:id")
  update(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: UpdatePartitionDto,
  ): Promise<Partition> {
    return this.partitionsService.update(id, req.user.id, dto);
  }
  @Delete("partitions/:id")
  remove(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<Partition> {
    return this.partitionsService.remove(id, req.user.id);
  }
}
