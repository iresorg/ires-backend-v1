import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Response, Request } from "express";
import { timestamp } from "rxjs";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: Error | HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | string[] = "Something went wrong";

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (exceptionResponse instanceof Object) {
                message = exceptionResponse["message"];
            } else {
                message = exceptionResponse || exception.message;
            }
        } else if (exception instanceof Error) {
            message = "Something went wrong: " + exception.message;
        }

        // TODO: Add logger here

        response.status(status).json({
            message,
            error: true,
            timestamp: new Date().toISOString(),
        });
    }
}