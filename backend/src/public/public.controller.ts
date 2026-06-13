import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import { PublicService } from "./public.service";
@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}
  @Get("boxes/by-qr")
  findBoxByQrQuery(
    @Query("code")
    qrCode: string,
  ) {
    if (!qrCode?.trim()) {
      throw new BadRequestException("Не указан QR-код");
    }
    return this.publicService.findBoxByQrCode(qrCode.trim());
  }
  @Get("boxes/by-qr/:qrCode")
  findBoxByQr(
    @Param("qrCode")
    qrCode: string,
  ) {
    return this.publicService.findBoxByQrCode(decodeURIComponent(qrCode));
  }
  @Get("storages/:id")
  findStorage(
    @Param("id")
    id: string,
  ) {
    return this.publicService.findStoragePublic(id);
  }
}
