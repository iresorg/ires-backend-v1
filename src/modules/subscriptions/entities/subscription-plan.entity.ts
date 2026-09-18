import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";
import { PlanPaymentType } from "../enums/plan-payment-type.enum";

@Entity({ name: "subscription_plans" })
export class SubscriptionPlan extends BaseEntity {
	@Index()
	@Column({ type: "varchar", name: "name" })
	name: string;

	@Index()
	@Column({ type: "int" })
	tier: number;

	@Index()
	@Column({ type: "varchar", name: "account_type" })
	accountType: "individual" | "organization";

	@Index()
	@Column({
		type: "varchar",
		name: "payment_type",
		default: PlanPaymentType.SUBSCRIPTION,
	})
	paymentType: PlanPaymentType;

	@Index()
	@Column({ type: "bigint" })
	amount: number;

	@Column({ type: "varchar", default: "NGN" })
	currency: string;

	/** Billing cadence for subscriptions (e.g. monthly). Unused for one_time. */
	@Column({ type: "varchar", default: "monthly", nullable: true })
	interval: string | null;

	@Index()
	@Column({ type: "varchar", name: "paystack_plan_code", nullable: true })
	paystackPlanCode: string | null;

	@Column({ type: "text" })
	description: string;

	@Column({ type: "jsonb" })
	features: Array<string>;

	@Column({ type: "int", name: "max_incidents", nullable: true })
	maxIncidents: number | null;

	@Index()
	@Column({ type: "boolean", default: true })
	active: boolean;
}
