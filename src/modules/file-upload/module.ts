import { Module } from "@nestjs/common";
import { CloudinaryController } from "./controller";
import { FileUploadService } from "./service";

@Module({
    controllers: [CloudinaryController],
    providers: [FileUploadService],
    exports: [FileUploadService]
})
export class FileUploadModule {}
