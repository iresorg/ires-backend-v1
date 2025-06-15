import "reflect-metadata";
import { plainToInstance, Transform } from "class-transformer";
import {
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsString,
	IsUrl,
	validateSync,
} from "class-validator";

export enum Environment {
	Development = "development",
	Production = "production",
	Test = "test",
}

export class EnvVariables {
	@IsString()
	
	AMQP_URL: string;

	@IsString()
	@IsEnum(Environment)
	NODE_ENV: Environment;

	@IsNumber()
	@Transform(({ value }: { value: string }) => parseInt(value, 10))
	DB_PORT: number;

	@IsString()
	DB_HOST: string;

	@IsString()
	DB_USER: string;

	@IsString()
	DB_PASS: string;

	@IsString()
	DB_NAME: string;

	@IsString()
	DB_TYPE: string;

	@IsString()
	EMAIL_HOST: string;

	@IsNumber()
	@Transform(({ value }: { value: string }) => parseInt(value, 10))
	EMAIL_PORT: number;

	@IsString()
	EMAIL_USER: string;

	@IsString()
	EMAIL_PASSWORD: string;

	@IsString()
	@IsNotEmpty()
	JWT_TOKEN_SECRET: string;

	@IsString()
	@IsNotEmpty()
	REFRESH_TOKEN_SECRET: string;

	@IsString()
	@IsNotEmpty()
	DEFAULT_SUPER_ADMIN_PASSWORD: string;

	@IsString()
	@IsNotEmpty()
	DEFAULT_SUPER_ADMIN_EMAIL: string;

	@IsString()
	@IsNotEmpty()
	DEFAULT_SUPER_ADMIN_FIRST_NAME: string;

	@IsString()
	@IsNotEmpty()
	DEFAULT_SUPER_ADMIN_LAST_NAME: string;
}

export function validateEnv(env: Record<string, unknown>) {
	const validatedEnv = plainToInstance(EnvVariables, env, {
		enableImplicitConversion: true,
	});

	const errors = validateSync(validatedEnv, {
		skipMissingProperties: false,
	});

	if (errors.length > 0) {
		throw new Error(
			`Environment validation failed: ${errors
				.map((e) => Object.values(e.constraints || {}))
				.flat()
				.join(", ")}`,
		);
	}

	return validatedEnv;
}
