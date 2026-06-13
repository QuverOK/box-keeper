import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { StoragesModule } from "./storages/storages.module";
import { BoxesModule } from "./boxes/boxes.module";
import { ItemsModule } from "./items/items.module";
import { PublicModule } from "./public/public.module";
import { PartitionsModule } from "./partitions/partitions.module";
import { LayoutLabelsModule } from "./layout-labels/layout-labels.module";
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    StoragesModule,
    BoxesModule,
    ItemsModule,
    PublicModule,
    PartitionsModule,
    LayoutLabelsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
