import { Environment, EnvVariables } from "@/utils/env.validate";
import { Injectable, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as winston from "winston";
import { AsyncContextService } from "../async-context/service";
import * as morgan from "morgan";

@Injectable()
export class Logger implements LoggerService {
	private logger: winston.Logger;
	constructor(
		private readonly configService: ConfigService<EnvVariables>,
		private readonly ctx: AsyncContextService,
	) {
		this.logger = this.createLogger();
	}
	log(message: string, metadata?: Record<string, any>) {
		this.logger.info(message, metadata);
	}
	error(message: string, metadata?: Record<string, any>) {
		this.logger.error(message, metadata);
	}
	warn(message: string, metadata?: Record<string, any>) {
		this.logger.warn(message, metadata);
	}
	debug(message: string, metadata?: Record<string, any>) {
		this.logger.debug(message, metadata);
	}
	http(message: object) {
		const logger = this.logger.child({});
		logger.http(message);
	}

	private createLogger() {
		return winston.createLogger({
			level: "debug",
			levels: winston.config.npm.levels,
			format: winston.format.combine(
				winston.format((info) => {
					info.requestId = this.ctx.get("requestId");
					info.userId = this.ctx.get("userId");
					info.timestamp = this.ctx.get("timestamp");
					if (info.stack) {
						info.stack = this.formatStackTrace(
							info.stack as string,
						);
					}

					return info;
				})(),
				winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss A" }),
				winston.format.json({ space: 2 }),
				winston.format.align(),
				winston.format.errors({ stack: true }),
				winston.format.colorize({
					all: true,
					colors: {
						info: "green",
						warn: "yellow",
						error: "red",
						http: "cyan",
					},
				}),
			),
			transports: [new winston.transports.Console()],
			silent: this.configService.get("NODE_ENV") === Environment.Test,
		});
	}

	logRequestSummary() {
		return morgan(
			(tokens, req, res) => {
				return JSON.stringify({
					content_length: tokens.res(req, res, "content-length"),
					method: tokens.method(req, res),
					path: tokens.url(req, res),
					ip: tokens["remote-addr"](req, res),
					timestamp: tokens.date(req, res, "iso"),
					response_status: res.statusCode,
					response_time: Number(tokens["response-time"](req, res)),
				});
			},
			{
				stream: {
					write: (message) =>
						this.http(JSON.parse(message) as object),
				},
			},
		);
	}

	private formatStackTrace(stack: string): string {
		let formatedStack = "";

		formatedStack += `\n${stack
			.split("\n")
			.map((line) => `  ${line}`)
			.join("\n")}`;

		return formatedStack;
	}
}
