import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { ConfigService } from "@nestjs/config";
import { EnvVariables } from "@/utils/env.validate";

export class TokenEncryption {
	private static readonly ALGORITHM = "aes-256-ctr";
	private static readonly IV_LENGTH = 16;
	private static readonly KEY_LENGTH = 32;
	private static readonly SALT = "token-encryption-salt"; // Fixed salt for key derivation
	private static encryptionKey: Buffer;
	private static isInitialized = false;

	static async initialize(configService: ConfigService<EnvVariables>) {
		// Prevent multiple initializations
		if (this.isInitialized) {
			return;
		}

		const secret = configService.get<string>("JWT_TOKEN_SECRET");
		if (!secret) {
			throw new Error("JWT_TOKEN_SECRET is not defined");
		}
		// Derive a 32-byte key using scrypt
		this.encryptionKey = (await promisify(scrypt)(
			secret,
			this.SALT,
			this.KEY_LENGTH,
		)) as Buffer;

		this.isInitialized = true;
	}

	static encrypt(token: string): string {
		if (!this.isInitialized || !this.encryptionKey) {
			throw new Error(
				"TokenEncryption not initialized. Call initialize() first.",
			);
		}

		const iv = randomBytes(this.IV_LENGTH);
		const cipher = createCipheriv(this.ALGORITHM, this.encryptionKey, iv);

		const encryptedText = Buffer.concat([
			cipher.update(token, "utf8"),
			cipher.final(),
		]);

		// Combine IV and encrypted data
		const result = Buffer.concat([iv, encryptedText]);
		return result.toString("base64");
	}

	static decrypt(encryptedToken: string): string {
		if (!this.isInitialized || !this.encryptionKey) {
			throw new Error(
				"TokenEncryption not initialized. Call initialize() first.",
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
