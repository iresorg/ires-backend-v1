import { EnvVariables } from "@/utils/env.validate";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UploadApiErrorResponse, UploadApiResponse, v2 } from "cloudinary";
import { Readable } from "node:stream";

@Injectable()
export class FileUploadService {
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

    async uploadImage(image: Express.Multer.File, publicId?: string): Promise<UploadApiResponse | UploadApiErrorResponse> {
        return new Promise((resolve, reject) => {
            const upload = v2.uploader.upload_stream({
                resource_type: "image",
                overwrite: true,
                folder: "images",
                ...(publicId && { public_id: publicId.split("/")[1] })
            }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            })
            Readable.from(image.buffer).pipe(upload);
        })
    }
}