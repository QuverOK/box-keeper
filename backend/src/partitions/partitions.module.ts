import { Module } from "@nestjs/common";
import { PartitionsService } from "./partitions.service";
import { PartitionsController } from "./partitions.controller";
import { StoragesModule } from "../storages/storages.module";
@Module({
  imports: [StoragesModule],
  controllers: [PartitionsController],
  providers: [PartitionsService],
})
export class PartitionsModule {}
