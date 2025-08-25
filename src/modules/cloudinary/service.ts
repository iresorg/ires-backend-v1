import { EnvVariables } from "@/utils/env.validate";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 } from "cloudinary";
import { timestamp } from "rxjs";

@Injectable()
export class CloudinaryService {
    constructor(private readonly env: ConfigService<EnvVariables, true>) {
        v2.config({
            cloud_name: env.get("CLOUDINARY_CLOUD_NAME"),
            api_key: env.get("CLOUDINARY_API_KEY"),
            api_secret: env.get("CLOUDINARY_API_SECRET"),
        })
    }
    async getUploadSignature() {
        const timestamp = new Date().getTime();
        const signature = v2.utils.api_sign_request({
            timestamp,
        }, this.env.get("CLOUDINARY_API_SECRET"));

        return { timestamp, signature };
    }
}