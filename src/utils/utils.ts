import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService, TokenExpiredError } from "@nestjs/jwt";
import { JsonWebTokenError } from "jsonwebtoken";
import * as bcrypt from "bcrypt";

@Injectable()
export class Utils {
	constructor(private readonly jwtService: JwtService) {}

	generatePassword(length: number = 12): string {
		const charset =
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
		let password = "";
		for (let i = 0; i < length; i++) {
			const randomIndex = Math.floor(Math.random() * charset.length);
			password += charset[randomIndex];
		}
		return password;
	}

	async createHash(text: string) {
		const salt = 10;
		return await bcrypt.hash(text, salt);
	}

	async ensureHashMatchesText(hash: string, text: string): Promise<boolean> {
		if (!hash) return false;

		return await bcrypt.compare(text, hash);
	}

	generateJWT<T extends object>(
		payload: T,
		expiresIn: number | `${number}h` = "4h",
	) {
		const token = this.jwtService.sign(payload, {
			expiresIn,
			algorithm: "HS256",
		});
		return token;
	}

	/**
	 * @throws {TokenExpiredError}
	 * @throws {InvalidTokenError}
	 */
	verifyJWT<T>(token: string) {
		try {
			return this.jwtService.verify(token, {
				algorithms: ["HS256"],
			}) as T;
		} catch (error) {
			if (error instanceof TokenExpiredError) {
				throw new UnauthorizedException(
					"Token has expired. Please login again.",
				);
			} else if (error instanceof JsonWebTokenError) {
				throw new UnauthorizedException(
					"Invalid token. Please login again.",
				);
			}
		}
	}
}
