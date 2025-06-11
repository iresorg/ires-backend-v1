import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import helmet from "helmet";
import { ValidationPipe } from "@nestjs/common";
import { AllExceptionsFilter } from "./shared/filters/all-exceptions.filters";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

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

	app.useGlobalFilters(new AllExceptionsFilter());

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

	await app.listen(3000);
}

bootstrap().catch((error) => {
	console.error("Failed to start application:", error);
	process.exit(1);
});
