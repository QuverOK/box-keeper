import { Module } from "@nestjs/common";
import { LayoutLabelsService } from "./layout-labels.service";
import { LayoutLabelsController } from "./layout-labels.controller";
import { StoragesModule } from "../storages/storages.module";

@Module({
  imports: [StoragesModule],
  controllers: [LayoutLabelsController],
  providers: [LayoutLabelsService],
})
export class LayoutLabelsModule {}
