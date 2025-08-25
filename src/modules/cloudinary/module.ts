import { Module } from "@nestjs/common";
import { CloudinaryController } from "./controller";
import { CloudinaryService } from "./service";

@Module({
    controllers: [CloudinaryController],
    providers: [CloudinaryService]
})
export class CloudinaryModule {}
