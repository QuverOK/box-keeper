import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import { PublicBoxResponse, PublicService } from "./public.service";

@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}
  @Get("boxes/by-qr")
  findBoxByQrQuery(
    @Query("code")
    qrCode: string,
  ): Promise<PublicBoxResponse> {
    if (!qrCode?.trim()) {
      throw new BadRequestException("Не указан QR-код");
    }
    return this.publicService.findBoxByQrCode(qrCode.trim());
  }
  @Get("boxes/by-qr/:qrCode")
  findBoxByQr(
    @Param("qrCode")
    qrCode: string,
  ): Promise<PublicBoxResponse> {
    return this.publicService.findBoxByQrCode(decodeURIComponent(qrCode));
  }
  @Get("storages/:id")
  findStorage(
    @Param("id")
    id: string,
  ): ReturnType<PublicService["findStoragePublic"]> {
    return this.publicService.findStoragePublic(id);
  }
}
