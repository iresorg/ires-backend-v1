import { Controller, Get } from "@nestjs/common";
import { CloudinaryService } from "./service";

@Controller("cloudinary")
export class CloudinaryController {
    constructor(private readonly cloudinaryService: CloudinaryService) {}

    @Get("upload-signature")
    async getUploadSignature() {
        const data = await this.cloudinaryService.getUploadSignature();

        return {
            message: "Upload signature fetched successfully",
            data,
        }
    }
}