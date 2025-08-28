import { Controller, Get } from "@nestjs/common";
import { FileUploadService } from "./service";

@Controller("cloudinary")
export class CloudinaryController {
    constructor(private readonly FileUploadService: FileUploadService) {}

    @Get("upload-signature")
    async getUploadSignature() {
        const data = await this.FileUploadService.getUploadSignature();

        return {
            message: "Upload signature fetched successfully",
            data,
        }
    }
}