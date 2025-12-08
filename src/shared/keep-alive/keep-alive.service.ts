import { Injectable, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { Logger } from "../logger/service";
import { EnvVariables } from "@/utils/env.validate";
import * as http from "http";

@Injectable()
export class KeepAliveService implements OnModuleInit {
	private readonly port: number;
	private readonly baseUrl: string;

	constructor(
		private readonly configService: ConfigService<EnvVariables>,
		private readonly logger: Logger,
	) {
		this.port = this.configService.get("PORT") ?? 3000;
		this.baseUrl = `http://localhost:${this.port}`;
		this.logger.log(
			`Keep-alive service configured for ${this.baseUrl} (works in dev & production)`,
		);
	}

	onModuleInit() {
		this.logger.log("Keep-alive service initialized");
		this.pingServer();
	}

	@Cron("*/30 * * * *")
	async pingServer() {
		try {
			const url = `${this.baseUrl}/api/v1/health`;
			await this.makeRequest(url);
			this.logger.log("Keep-alive ping successful");
		} catch (error) {
			this.logger.warn(
				`Keep-alive ping failed: ${error.message}. Trying root endpoint...`,
			);
			try {
				await this.makeRequest(`${this.baseUrl}/`);
			} catch (fallbackError) {
				this.logger.error(
					`Keep-alive ping failed on both endpoints: ${fallbackError.message}`,
				);
			}
		}
	}

	private makeRequest(url: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = http.get(url, (response) => {
				if (response.statusCode === 200 || response.statusCode === 404) {
					resolve();
				} else {
					reject(
						new Error(
							`Unexpected status code: ${response.statusCode}`,
						),
					);
				}
				response.on("data", () => {});
				response.on("end", () => {});
			});

			request.on("error", (error) => {
				reject(error);
			});

			request.setTimeout(5000, () => {
				request.destroy();
				reject(new Error("Request timeout"));
			});
		});
	}
}

