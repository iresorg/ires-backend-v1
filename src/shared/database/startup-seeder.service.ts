import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
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
			await this.seedSubscriptionPlans();
			this.logger.log("Startup seeder completed successfully");
		} catch (error) {
			this.logger.error(
				`Startup seeder failed: ${error.message}`,
				error.stack,
			);
		}
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

