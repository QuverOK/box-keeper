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
import { LayoutLabel } from "@prisma/client";
import { LayoutLabelsService } from "./layout-labels.service";
import { CreateLayoutLabelDto } from "./dto/create-layout-label.dto";
import { UpdateLayoutLabelDto } from "./dto/update-layout-label.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedRequest } from "../auth/auth-user";
@UseGuards(JwtAuthGuard)
@Controller()
export class LayoutLabelsController {
  constructor(private readonly layoutLabelsService: LayoutLabelsService) {}
  @Post("storages/:storageId/layout-labels")
  create(
    @Param("storageId")
    storageId: string,
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: CreateLayoutLabelDto,
  ): Promise<LayoutLabel> {
    return this.layoutLabelsService.create(storageId, req.user.id, dto);
  }
  @Get("storages/:storageId/layout-labels")
  findAll(
    @Param("storageId")
    storageId: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<LayoutLabel[]> {
    return this.layoutLabelsService.findAll(storageId, req.user.id);
  }
  @Patch("layout-labels/:id")
  update(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
    @Body()
    dto: UpdateLayoutLabelDto,
  ): Promise<LayoutLabel> {
    return this.layoutLabelsService.update(id, req.user.id, dto);
  }
  @Delete("layout-labels/:id")
  remove(
    @Param("id")
    id: string,
    @Request()
    req: AuthenticatedRequest,
  ): Promise<LayoutLabel> {
    return this.layoutLabelsService.remove(id, req.user.id);
  }
}
