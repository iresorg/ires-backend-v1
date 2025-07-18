import "reflect-metadata";
import { DataSource, DataSourceOptions, QueryRunner } from "typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { User } from "../../modules/users/entities/user.entity";
import { Injectable, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Environment, EnvVariables, validateEnv } from "@/utils/env.validate";
import "dotenv/config";
import { Tickets } from "@/modules/tickets/entities/ticket.entity";
import { TicketLifecycle } from "@/modules/tickets/entities/ticket-lifecycle.entity";
import { TicketCategory } from "@/modules/ticket-categories/entities/ticket-category.entity";
import { TicketSubCategory } from "@/modules/ticket-categories/entities/ticket-sub-category.entity";

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
		entities: [
			User,
			Tickets,
			TicketLifecycle,
			TicketCategory,
			TicketSubCategory,
		],
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

export class TDatabaseTransaction {
	constructor(private queryRunner: QueryRunner) {}

	async commit() {
		if (!this.queryRunner.isTransactionActive) {
			throw new Error("Transaction not started before calling commit");
		}
		await this.queryRunner.commitTransaction();
		await this.queryRunner.release();
	}

	async rollback() {
		if (!this.queryRunner.isTransactionActive) {
			throw new Error("Callig rollback outside a transaction");
		}
		await this.queryRunner.rollbackTransaction();
		await this.queryRunner.release();
	}

	getContext() {
		return this.queryRunner;
	}
}

@Injectable()
export class TDatabaseService {
	constructor(private datasource: DataSource) {}

	async withTransaction<T>(
		callback: (trx: TDatabaseTransaction) => Promise<T>,
	) {
		const queryRunner = this.datasource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();
		const trx = new TDatabaseTransaction(queryRunner);
		try {
			const result = await callback(trx);
			await trx.commit();

			return result;
		} catch (error) {
			await trx.rollback();
			throw error;
		}
	}
}

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: createDataSourceFactory,
		}),
	],
	providers: [TDatabaseService],
	exports: [TDatabaseService],
})
export class DatabaseModule {}
