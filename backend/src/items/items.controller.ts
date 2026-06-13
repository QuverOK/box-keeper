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
import { Item, Prisma } from "@prisma/client";
import { ItemsService } from "./items.service";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedRequest } from "../auth/auth-user";

type ItemWithBoxAndStorage = Prisma.ItemGetPayload<{
  include: { box: { include: { storage: true } } };
}>;

@UseGuards(JwtAuthGuard)
@Controller()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}
  @Post("boxes/:boxId/items")
  create(
    @Param("boxId")
    boxId: string,
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: CreateItemDto,
  ): Promise<Item> {
    return this.itemsService.create(boxId, req.user.id, dto);
  }
  @Get("boxes/:boxId/items")
  findAll(
    @Param("boxId")
    boxId: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<Item[]> {
    return this.itemsService.findAll(boxId, req.user.id);
  }
  @Get("items/:id")
  findOne(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<ItemWithBoxAndStorage> {
    return this.itemsService.findOne(id, req.user.id);
  }
  @Patch("items/:id")
  update(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: UpdateItemDto,
  ): Promise<Item> {
    return this.itemsService.update(id, req.user.id, dto);
  }
  @Delete("items/:id")
  remove(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<Item> {
    return this.itemsService.remove(id, req.user.id);
  }
}
