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

		for (const planData of SUBSCRIPTION_PLANS) {
			const existingPlan = await planRepository.findOne({
				where: { paystackPlanCode: planData.paystackPlanCode },
			});

			if (existingPlan) {
				await planRepository.update(existingPlan.id, {
					name: planData.name,
					tier: planData.tier,
					accountType: planData.accountType,
					amount: planData.amount,
					currency: planData.currency,
					interval: planData.interval,
					description: planData.description,
					features: planData.features,
					maxIncidents: planData.maxIncidents,
					active: planData.active,
				});
				this.logger.log(`Updated subscription plan: ${planData.name}`);
			} else {
				const plan = planRepository.create(planData);
				await planRepository.save(plan);
				this.logger.log(`Created subscription plan: ${planData.name}`);
			}
		}
	}
}

