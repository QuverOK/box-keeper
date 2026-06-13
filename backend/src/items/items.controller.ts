import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, } from "@nestjs/common";
import { ItemsService } from "./items.service";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
@UseGuards(JwtAuthGuard)
@Controller()
export class ItemsController {
    constructor(private readonly itemsService: ItemsService) { }
    @Post("boxes/:boxId/items")
    create(
    @Param("boxId")
    boxId: string,
    @Request()
    req,
    @Body()
    dto: CreateItemDto) {
        return this.itemsService.create(boxId, req.user.id, dto);
    }
    @Get("boxes/:boxId/items")
    findAll(
    @Param("boxId")
    boxId: string,
    @Request()
    req) {
        return this.itemsService.findAll(boxId, req.user.id);
    }
    @Get("items/:id")
    findOne(
    @Param("id")
    id: string,
    @Request()
    req) {
        return this.itemsService.findOne(id, req.user.id);
    }
    @Patch("items/:id")
    update(
    @Param("id")
    id: string,
    @Request()
    req,
    @Body()
    dto: UpdateItemDto) {
        return this.itemsService.update(id, req.user.id, dto);
    }
    @Delete("items/:id")
    remove(
    @Param("id")
    id: string,
    @Request()
    req) {
        return this.itemsService.remove(id, req.user.id);
    }
}
