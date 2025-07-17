import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { User } from "../../modules/users/entities/user.entity";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Environment, EnvVariables, validateEnv } from "@/utils/env.validate";
import "dotenv/config";

export function createDataSourceOptions(
	env?: Partial<EnvVariables>,
): DataSourceOptions {
	const config = env || validateEnv(process.env);

	return {
		type: "postgres",
		host: config.DB_HOST,
		port: config.DB_PORT,
		username: config.DB_USER,
		password: config.DB_PASS,
		database: config.DB_NAME,
		entities: [User],
		migrations: ["src/shared/database/migrations/*.ts"],
		migrationsTableName: "migrations",
		synchronize: config.NODE_ENV !== Environment.Production,
		logging: false,
	};
}

export function createDataSourceFactory(
	configService: ConfigService<EnvVariables>,
): DataSourceOptions {
	return createDataSourceOptions({
		DB_HOST: configService.get("DB_HOST"),
		DB_PORT: configService.get("DB_PORT"),
		DB_USER: configService.get("DB_USER"),
		DB_PASS: configService.get("DB_PASS"),
		DB_NAME: configService.get("DB_NAME"),
		NODE_ENV: configService.get("NODE_ENV"),
	});
}

export const env = validateEnv(process.env);
export const AppDataSource = new DataSource(createDataSourceOptions(env));

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: createDataSourceFactory,
		}),
	],
})
export class DatabaseModule {}
