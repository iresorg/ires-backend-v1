import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Subscription } from "../entities/subscription.entity";
import { SubscriptionPlan } from "../entities/subscription-plan.entity";
import { SubscriptionStatus } from "../entities/subscription.entity";
import { PlanPaymentType } from "../enums/plan-payment-type.enum";

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

	async findPlanByPaystackCode(
		paystackPlanCode: string,
	): Promise<SubscriptionPlan | null> {
		return await this.plans.findOne({
			where: { paystackPlanCode },
		});
	}

	async findAllPlans(
		accountType?: "individual" | "organization",
		paymentType?: PlanPaymentType | string,
	) {
		const where: {
			active: boolean;
			accountType?: "individual" | "organization";
			paymentType?: PlanPaymentType;
		} = { active: true };

		if (accountType) {
			where.accountType = accountType.toLowerCase().trim() as
				| "individual"
				| "organization";
		}

		if (paymentType) {
			where.paymentType = paymentType as PlanPaymentType;
		}

		return await this.plans.find({
			where,
			order: { tier: "ASC" },
		});
	}

	async findAllPlansForAdmin(filters?: {
		accountType?: "individual" | "organization";
		paymentType?: PlanPaymentType | string;
	}) {
		const where: {
			accountType?: "individual" | "organization";
			paymentType?: PlanPaymentType;
		} = {};

		if (filters?.accountType) {
			where.accountType = filters.accountType;
		}
		if (filters?.paymentType) {
			where.paymentType = filters.paymentType as PlanPaymentType;
		}

		return await this.plans.find({
			where: Object.keys(where).length ? where : undefined,
			order: { accountType: "ASC", tier: "ASC" },
		});
	}

	async createPlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
		const plan = this.plans.create(data);
		return await this.plans.save(plan);
	}

	async updatePlan(
		id: string,
		data: Partial<SubscriptionPlan>,
	): Promise<void> {
		await this.plans.update({ id }, data);
	}

	async deletePlan(id: string): Promise<void> {
		await this.plans.delete({ id });
	}

	async countSubscriptionsByPlanId(planId: string): Promise<number> {
		return await this.subscriptions.count({ where: { planId } });
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

	async findActiveAccountIds(): Promise<string[]> {
		const rows = await this.subscriptions
			.createQueryBuilder("subscription")
			.select("DISTINCT subscription.account_id", "accountId")
			.where("subscription.status = :status", {
				status: SubscriptionStatus.ACTIVE,
			})
			.getRawMany<{ accountId: string }>();

		return rows.map((row) => row.accountId);
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

	async findByTransactionReference(
		reference: string,
	): Promise<Subscription | null> {
		return await this.subscriptions
			.createQueryBuilder("subscription")
			.leftJoinAndSelect("subscription.plan", "plan")
			.leftJoinAndSelect("subscription.account", "account")
			.where(
				"subscription.metadata->>'transactionReference' = :reference",
				{
					reference,
				},
			)
			.getOne();
	}

	async findByPaystackCustomerCode(
		customerCode: string,
	): Promise<Subscription | null> {
		return await this.subscriptions.findOne({
			where: { paystackCustomerCode: customerCode },
			relations: ["plan", "account"],
			order: { createdAt: "DESC" }, // Get most recent
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
