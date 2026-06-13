import { Module } from "@nestjs/common";
import { StoragesService } from "./storages.service";
import { StoragesController } from "./storages.controller";

@Module({
  controllers: [StoragesController],
  providers: [StoragesService],
  exports: [StoragesService],
})
export class StoragesModule {}
