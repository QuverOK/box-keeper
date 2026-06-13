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
import { Box, Prisma } from "../generated/prisma/client";
import { BoxesService } from "./boxes.service";
import { CreateBoxDto } from "./dto/create-box.dto";
import { UpdateBoxDto } from "./dto/update-box.dto";
import { MoveBoxDto } from "./dto/move-box.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedRequest } from "../auth/auth-user";

type BoxWithItems = Prisma.BoxGetPayload<{ include: { items: true } }>;
type BoxWithItemsAndStorage = Prisma.BoxGetPayload<{
  include: { items: true; storage: true };
}>;

@UseGuards(JwtAuthGuard)
@Controller()
export class BoxesController {
  constructor(private readonly boxesService: BoxesService) {}
  @Post("storages/:storageId/boxes")
  create(
    @Param("storageId")
    storageId: string,
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: CreateBoxDto,
  ): Promise<BoxWithItems> {
    return this.boxesService.create(storageId, req.user.id, dto);
  }
  @Get("storages/:storageId/boxes")
  findAll(
    @Param("storageId")
    storageId: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<BoxWithItems[]> {
    return this.boxesService.findAll(storageId, req.user.id);
  }
  @Get("boxes/:id")
  findOne(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<BoxWithItemsAndStorage> {
    return this.boxesService.findOne(id, req.user.id);
  }
  @Patch("boxes/:id")
  update(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: UpdateBoxDto,
  ): Promise<BoxWithItems> {
    return this.boxesService.update(id, req.user.id, dto);
  }
  @Patch("boxes/:id/position")
  move(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: MoveBoxDto,
  ): Promise<BoxWithItems> {
    return this.boxesService.move(id, req.user.id, dto);
  }
  @Delete("boxes/:id")
  remove(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<Box> {
    return this.boxesService.remove(id, req.user.id);
  }
}
