import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import helmet from "helmet";
import { ValidationPipe } from "@nestjs/common";
import { AllExceptionsFilter } from "./shared/filters/all-exceptions.filters";
import { Logger } from "./shared/logger/service";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { EnvVariables } from "./utils/env.validate";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const logger = await app.resolve(Logger);
	const env = await app.resolve(ConfigService<EnvVariables>);
	// app.useLogger(logger);

	// Security middleware
	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					scriptSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"],
					imgSrc: ["'self'", "data:", "https:"],
				},
			},
		}),
	);

	app.getHttpAdapter().get("/", (_, res: Response) => {
		res.status(200).json({
			message: "Welcome to iRES Backend Server"
		})
	})

	// setInterval(() => {
	// 	const memoryUsage = process.memoryUsage();
	// 	console.log('Memory Usage:', {
	// 		res: (memoryUsage.rss /1024 /1024).toFixed(2) + "MB",
	// 		heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + 'MB',
	// 		heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + "MB",
	// 		external: (memoryUsage.external / 1024 / 1024).toFixed(2) + 'MB'
	// 	})
	// }, 5000)

	// Global validation pipe - using built-in NestJS pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			forbidUnknownValues: true,
			stopAtFirstError: true,
			transform: true,
		}),
	);

	app.useGlobalFilters(new AllExceptionsFilter(logger));

	app.setGlobalPrefix("api/v1");

	const config = new DocumentBuilder()
		.setTitle("iRES API")
		.setDescription("Cybersecurity Incident Response Hotline API")
		.setVersion("1.0")
		.addTag("auth", "Authentication endpoints")
		.addBearerAuth(
			{
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
				name: "JWT",
				description: "Enter JWT token",
				in: "header",
			},
			"JWT-auth",
		)
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("api", app, document);

	await app.listen(env.get("PORT") ?? 3000);
}

bootstrap().catch((error) => {
	console.error("Failed to start application:", error);
	process.exit(1);
});
