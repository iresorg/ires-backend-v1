import { Injectable, NestMiddleware } from "@nestjs/common";
import { AsyncContextService } from "./service";
import type { NextFunction, Request, Response } from "express";
import * as crypto from "crypto";

@Injectable()
export class AsyncContextMiddleware implements NestMiddleware {
	constructor(private readonly asyncContextService: AsyncContextService) {}

	use(req: Request, _: Response, next: NextFunction) {
		const requestId = crypto.randomUUID();
		const timestamp = new Date();
		return this.asyncContextService.run(
			{
				requestId,
				timestamp,
				path: req.path,
				url: req.url,
				method: req.method,
				ip: req.ip,
			},

			() => {
				next();
			},
		);
	}
}
