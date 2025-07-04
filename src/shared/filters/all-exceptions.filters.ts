import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { Response, Request } from "express";
import { Logger } from "../logger/service";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	constructor(private readonly logger: Logger) {}
	catch(exception: Error | HttpException, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		let status = HttpStatus.INTERNAL_SERVER_ERROR;
		let message: string | string[] = "Something went wrong";

		if (exception instanceof HttpException) {
			status = exception.getStatus();
			const exceptionResponse = exception.getResponse();

			if (exceptionResponse instanceof Object) {
				message = exceptionResponse["message"] as string;
			} else {
				message = exceptionResponse || exception.message;
			}
		} else if (exception instanceof Error) {
			message = "Something went wrong: " + exception.message;
		}

		this.logger.error(message, {
			stack: exception.stack,
			status,
			path: request.originalUrl,
		});

		response.status(status).json({
			message:
				status >= HttpStatus.INTERNAL_SERVER_ERROR
					? "Something went wrong"
					: message,
			error: true,
			timestamp: new Date().toISOString(),
		});
	}
}
