import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";

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
	@Column({ type: "bigint" })
	amount: number;

	@Column({ type: "varchar", default: "NGN" })
	currency: string;

	@Column({ type: "varchar", default: "monthly" })
	interval: string;

	@Index()
	@Column({ type: "varchar", name: "paystack_plan_code" })
	paystackPlanCode: string;

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
