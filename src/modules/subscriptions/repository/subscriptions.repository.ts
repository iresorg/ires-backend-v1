import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Subscription } from "../entities/subscription.entity";
import { SubscriptionPlan } from "../entities/subscription-plan.entity";
import { SubscriptionStatus } from "../entities/subscription.entity";

@Injectable()
export class SubscriptionsRepository {
	constructor(
		@InjectRepository(Subscription)
		private readonly subscriptions: Repository<Subscription>,
		@InjectRepository(SubscriptionPlan)
		private readonly plans: Repository<SubscriptionPlan>,
	) {}

	async findPlanById(id: string): Promise<SubscriptionPlan | null> {
		return await this.plans.findOne({ where: { id } });
	}

	async findAllPlans(accountType?: "individual" | "organization") {
		if (accountType) {
			const normalized = accountType.toLowerCase().trim() as
				| "individual"
				| "organization";
			return await this.plans.find({
				where: { accountType: normalized, active: true },
				order: { tier: "ASC" },
			});
		}
		return await this.plans.find({
			where: { active: true },
			order: { tier: "ASC" },
		});
	}

	async findActiveSubscriptionByAccountId(
		accountId: string,
	): Promise<Subscription | null> {
		return await this.subscriptions.findOne({
			where: {
				accountId,
				status: SubscriptionStatus.ACTIVE,
			},
			relations: ["plan"],
		});
	}

	async findById(id: string): Promise<Subscription | null> {
		return await this.subscriptions.findOne({
			where: { id },
			relations: ["plan"],
		});
	}

	async findByPaystackCode(
		paystackSubscriptionCode: string,
	): Promise<Subscription | null> {
		return await this.subscriptions.findOne({
			where: { paystackSubscriptionCode },
			relations: ["plan", "account"],
		});
	}

	async createSubscription(
		data: Partial<Subscription>,
	): Promise<Subscription> {
		const subscription = this.subscriptions.create(data);
		return await this.subscriptions.save(subscription);
	}

	async updateSubscription(
		id: string,
		data: Partial<Subscription>,
	): Promise<void> {
		await this.subscriptions.update({ id }, data);
	}

	async cancelSubscriptionAtPeriodEnd(id: string): Promise<void> {
		await this.subscriptions.update(
			{ id },
			{ cancelAtPeriodEnd: true, cancelledAt: new Date() },
		);
	}

	async resumeSubscription(id: string): Promise<void> {
		await this.subscriptions.update(
			{ id },
			{ cancelAtPeriodEnd: false, cancelledAt: null },
		);
	}
}
