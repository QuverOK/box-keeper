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
import { Storage } from "../generated/prisma/client";
import { StoragesService, StorageWithRelations } from "./storages.service";
import { CreateStorageDto } from "./dto/create-storage.dto";
import { UpdateStorageDto } from "./dto/update-storage.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedRequest } from "../auth/auth-user";
@UseGuards(JwtAuthGuard)
@Controller("storages")
export class StoragesController {
  constructor(private readonly storagesService: StoragesService) {}
  @Post()
  create(
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: CreateStorageDto,
  ): Promise<StorageWithRelations> {
    return this.storagesService.create(req.user.id, dto);
  }
  @Get()
  findAll(
    @Request()
    req: AuthenticatedRequest,
  ): Promise<StorageWithRelations[]> {
    return this.storagesService.findAll(req.user.id);
  }
  @Get(":id")
  findOne(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<StorageWithRelations> {
    return this.storagesService.findOne(id, req.user.id);
  }
  @Patch(":id")
  update(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: UpdateStorageDto,
  ): Promise<StorageWithRelations> {
    return this.storagesService.update(id, req.user.id, dto);
  }
  @Delete(":id")
  remove(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<Storage> {
    return this.storagesService.remove(id, req.user.id);
  }
}
