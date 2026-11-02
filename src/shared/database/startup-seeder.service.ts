import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { User } from "@/modules/users/entities/user.entity";
import { Role } from "@/modules/users/enums/role.enum";
import { SubscriptionPlan } from "@/modules/subscriptions/entities/subscription-plan.entity";
import { SUBSCRIPTION_PLANS } from "./subscription-plans.data";
import { EnvVariables } from "@/utils/env.validate";
import { Logger } from "../logger/service";

@Injectable()
export class StartupSeederService implements OnModuleInit {
	constructor(
		@InjectDataSource()
		private readonly dataSource: DataSource,
		private readonly configService: ConfigService<EnvVariables>,
		private readonly logger: Logger,
	) {}

	async onModuleInit() {
		try {
			this.logger.log("Running startup seeder...");
			await this.ensureTokenVersionColumns();
			await this.ensureIncidentReportsTable();
			await this.ensureUserPasswordResetsTable();
			await this.seedSuperAdmin();
			await this.seedSubscriptionPlans();
			this.logger.log("Startup seeder completed successfully");
		} catch (error) {
			this.logger.error(
				`Startup seeder failed: ${error.message}`,
				error.stack,
			);
		}
	}

	private async ensureTokenVersionColumns() {
		await this.dataSource.query(`
			ALTER TABLE "accounts"
			ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0
		`);
		await this.dataSource.query(`
			ALTER TABLE "users"
			ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0
		`);
		await this.dataSource.query(`
			ALTER TABLE "users"
			ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false
		`);
		await this.dataSource.query(`
			ALTER TABLE "accounts"
			ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false
		`);
	}

	private async ensureIncidentReportsTable() {
		await this.dataSource.query(`
			CREATE TABLE IF NOT EXISTS "incident_reports" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"reference" character varying NOT NULL,
				"account_id" uuid NOT NULL,
				"status" character varying NOT NULL DEFAULT 'OPEN',
				"severity" character varying NOT NULL,
				"incident_type" character varying NOT NULL,
				"ongoing" character varying NOT NULL,
				"name" character varying NOT NULL,
				"organization" character varying,
				"phone" character varying NOT NULL,
				"email" character varying NOT NULL,
				"detected_at" character varying,
				"affected_systems" text,
				"description" text NOT NULL,
				"assigned_agent_id" uuid,
				"ticket_id" character varying,
				"created_by_staff_id" uuid,
				CONSTRAINT "PK_incident_reports" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_incident_reports_reference" UNIQUE ("reference")
			)
		`);
		await this.dataSource.query(`
			CREATE INDEX IF NOT EXISTS "IDX_incident_reports_account"
			ON "incident_reports" ("account_id")
		`);
		await this.dataSource.query(`
			CREATE INDEX IF NOT EXISTS "IDX_incident_reports_ticket"
			ON "incident_reports" ("ticket_id")
		`);
		await this.dataSource.query(`
			ALTER TABLE "incident_reports"
			ALTER COLUMN "organization" DROP NOT NULL
		`);
	}

	private async ensureUserPasswordResetsTable() {
		await this.dataSource.query(`
			CREATE TABLE IF NOT EXISTS "user_password_resets" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"email" character varying NOT NULL,
				"token" character varying NOT NULL,
				"expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
				"used" boolean NOT NULL DEFAULT false,
				"user_id" uuid,
				CONSTRAINT "PK_user_password_resets" PRIMARY KEY ("id")
			)
		`);
		await this.dataSource.query(`
			DO $$ BEGIN
				ALTER TABLE "user_password_resets"
				ADD CONSTRAINT "FK_user_password_resets_user"
				FOREIGN KEY ("user_id") REFERENCES "users"("id")
				ON DELETE CASCADE ON UPDATE NO ACTION;
			EXCEPTION
				WHEN duplicate_object THEN NULL;
			END $$;
		`);
		await this.dataSource.query(`
			CREATE INDEX IF NOT EXISTS "IDX_user_password_resets_email"
			ON "user_password_resets" ("email")
		`);
		await this.dataSource.query(`
			CREATE INDEX IF NOT EXISTS "IDX_user_password_resets_token"
			ON "user_password_resets" ("token")
		`);
	}

	private async seedSuperAdmin() {
		const userRepository = this.dataSource.getRepository(User);
		const existingSuperAdmin = await userRepository.findOne({
			where: { role: Role.SUPER_ADMIN },
		});

		if (existingSuperAdmin) {
			this.logger.log(
				`Super admin already exists: ${existingSuperAdmin.email}`,
			);
			return;
		}

		const email = this.configService.get("DEFAULT_SUPER_ADMIN_EMAIL");
		const newSuperAdmin = userRepository.create({
			email,
			firstName: this.configService.get("DEFAULT_SUPER_ADMIN_FIRST_NAME"),
			lastName: this.configService.get("DEFAULT_SUPER_ADMIN_LAST_NAME"),
			password: await bcrypt.hash(
				this.configService.get("DEFAULT_SUPER_ADMIN_PASSWORD"),
				10,
			),
			role: Role.SUPER_ADMIN,
		});
		await userRepository.save(newSuperAdmin);
		this.logger.log(`Created super admin: ${email}`);
	}

	private async seedSubscriptionPlans() {
		const planRepository = this.dataSource.getRepository(SubscriptionPlan);
		const existingCount = await planRepository.count();
		if (existingCount > 0) {
			this.logger.log(
				"Subscription plans already exist; skipping seed so admin edits are preserved",
			);
			return;
		}

		for (const planData of SUBSCRIPTION_PLANS) {
			const plan = planRepository.create(planData);
			await planRepository.save(plan);
			this.logger.log(`Created subscription plan: ${planData.name}`);
		}
	}
}

