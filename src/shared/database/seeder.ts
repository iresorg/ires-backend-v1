import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { User } from "@/modules/users/entities/user.entity";
import { Role } from "@/modules/users/enums/role.enum";
import { SubscriptionPlan } from "@/modules/subscriptions/entities/subscription-plan.entity";
import * as bcrypt from "bcrypt";
import { EnvVariables } from "@/utils/env.validate";
import { AppDataSource, env } from "./datasource";
import { SUBSCRIPTION_PLANS } from "./subscription-plans.data";

@Injectable()
export class Seeder {
	constructor(
		private readonly dataSource: DataSource,
		private readonly env: EnvVariables,
	) {}

	async seed() {
		if (!this.dataSource.isInitialized) {
			await this.dataSource.initialize();
		}
		await this.seedSuperAdmin();
		await this.seedSubscriptionPlans();

		await this.dataSource.destroy();
	}

	async seedSuperAdmin() {
		const userRepository = this.dataSource.getRepository(User);
		const superAdmin = await userRepository.findOne({
			where: {
				role: Role.SUPER_ADMIN,
			},
		});
		if (superAdmin) {
			return;
		}
		const newSuperAdmin = userRepository.create({
			email: this.env.DEFAULT_SUPER_ADMIN_EMAIL,
			firstName: this.env.DEFAULT_SUPER_ADMIN_FIRST_NAME,
			lastName: this.env.DEFAULT_SUPER_ADMIN_LAST_NAME,
			password: await bcrypt.hash(
				this.env.DEFAULT_SUPER_ADMIN_PASSWORD,
				10,
			),
			role: Role.SUPER_ADMIN,
		});
		await userRepository.save(newSuperAdmin);
	}

	async seedSubscriptionPlans() {
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
			} else {
				const plan = planRepository.create(planData);
				await planRepository.save(plan);
			}
		}
	}
}

const seeder = new Seeder(AppDataSource, env);

seeder.seed().catch(console.error);
