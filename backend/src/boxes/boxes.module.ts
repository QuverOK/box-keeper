import { Module } from "@nestjs/common";
import { BoxesService } from "./boxes.service";
import { BoxesController } from "./boxes.controller";
import { StoragesModule } from "../storages/storages.module";
@Module({
    imports: [StoragesModule],
    controllers: [BoxesController],
    providers: [BoxesService],
    exports: [BoxesService],
})
export class BoxesModule {
}
