import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { EnvVariables } from "@/utils/env.validate";
import { BadRequestException } from "@nestjs/common";

export class TokenEncryption {
	private static readonly ALGORITHM = "aes-256-ctr";
	private static readonly IV_LENGTH = 16;
	private static readonly KEY_LENGTH = 32;
	private static encryptionKey: Buffer;
	private static isInitialized = false;

	static initialize(configService: ConfigService<EnvVariables>) {
		if (this.isInitialized) {
			return;
		}

		const encryptionKey = configService.get<string>("TOKEN_ENCRYPTION_KEY");
		if (!encryptionKey) {
			throw new Error(
				"TOKEN_ENCRYPTION_KEY is not defined in environment variables",
			);
		}

		if (encryptionKey.length !== this.KEY_LENGTH * 2) {
			throw new Error(
				"TOKEN_ENCRYPTION_KEY must be exactly 64 characters (32 bytes in hex)",
			);
		}

		try {
			this.encryptionKey = Buffer.from(encryptionKey, "hex");
			this.isInitialized = true;
		} catch {
			throw new Error("TOKEN_ENCRYPTION_KEY must be a valid hex string");
		}
	}

	static encrypt(token: string): string {
		if (!this.isReady()) {
			throw new BadRequestException(
				"Token encryption service is not ready. Please try again.",
			);
		}

		const iv = randomBytes(this.IV_LENGTH);
		const cipher = createCipheriv(this.ALGORITHM, this.encryptionKey, iv);

		const encryptedText = Buffer.concat([
			cipher.update(token, "utf8"),
			cipher.final(),
		]);

		const result = Buffer.concat([iv, encryptedText]);
		return result.toString("base64");
	}

	static decrypt(encryptedToken: string): string {
		if (!this.isReady()) {
			throw new BadRequestException(
				"Token encryption service is not ready. Please try again.",
			);
		}

		const buffer = Buffer.from(encryptedToken, "base64");
		const iv = buffer.subarray(0, this.IV_LENGTH);
		const encryptedText = buffer.subarray(this.IV_LENGTH);

		const decipher = createDecipheriv(
			this.ALGORITHM,
			this.encryptionKey,
			iv,
		);
		const decryptedText = Buffer.concat([
			decipher.update(encryptedText),
			decipher.final(),
		]);
		return decryptedText.toString("utf8");
	}

	static isReady(): boolean {
		return this.isInitialized && !!this.encryptionKey;
	}
}
