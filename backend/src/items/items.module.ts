import { Module } from "@nestjs/common";
import { ItemsService } from "./items.service";
import { ItemsController } from "./items.controller";
import { BoxesModule } from "../boxes/boxes.module";
@Module({
    imports: [BoxesModule],
    controllers: [ItemsController],
    providers: [ItemsService],
})
export class ItemsModule {
}
