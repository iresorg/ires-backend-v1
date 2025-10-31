import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";
import { Account } from "@/modules/accounts/entities/account.entity";
import { SubscriptionPlan } from "./subscription-plan.entity";

export enum SubscriptionStatus {
	ACTIVE = "active",
	EXPIRED = "expired",
	CANCELLED = "cancelled",
	PAST_DUE = "past_due",
}

@Entity({ name: "subscriptions" })
export class Subscription extends BaseEntity {
	@ManyToOne(() => Account, { onDelete: "CASCADE" })
	@JoinColumn({ name: "account_id" })
	account: Account;

	@Column({ type: "uuid", name: "account_id" })
	accountId: string;

	@ManyToOne(() => SubscriptionPlan)
	@JoinColumn({ name: "plan_id" })
	plan: SubscriptionPlan;

	@Column({ type: "uuid", name: "plan_id" })
	planId: string;

	@Index()
	@Column({ type: "varchar", name: "paystack_customer_code", nullable: true })
	paystackCustomerCode: string | null;

	@Index()
	@Column({
		type: "varchar",
		name: "paystack_subscription_code",
		nullable: true,
	})
	paystackSubscriptionCode: string | null;

	@Column({
		type: "varchar",
		name: "paystack_email_token",
		nullable: true,
	})
	paystackEmailToken: string | null;

	@Index()
	@Column({
		type: "enum",
		enum: SubscriptionStatus,
		default: SubscriptionStatus.ACTIVE,
	})
	status: SubscriptionStatus;

	@Column({ type: "timestamptz", name: "current_period_start" })
	currentPeriodStart: Date;

	@Column({ type: "timestamptz", name: "current_period_end" })
	currentPeriodEnd: Date;

	@Column({ type: "timestamptz", name: "next_billing_date" })
	nextBillingDate: Date;

	@Column({ type: "boolean", name: "cancel_at_period_end", default: false })
	cancelAtPeriodEnd: boolean;

	@Column({ type: "timestamptz", name: "cancelled_at", nullable: true })
	cancelledAt: Date | null;

	@Column({ type: "jsonb", nullable: true })
	metadata: Record<string, any> | null;
}
