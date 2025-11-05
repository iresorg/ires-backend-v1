import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";
import { Account } from "@/modules/accounts/entities/account.entity";
import { SubscriptionPlan } from "./subscription-plan.entity";
import { Subscription } from "./subscription.entity";

export enum TransactionStatus {
	SUCCESS = "success",
	FAILED = "failed",
	PENDING = "pending",
}

@Entity({ name: "subscription_transactions" })
export class SubscriptionTransaction extends BaseEntity {
	@ManyToOne(() => Account, { onDelete: "CASCADE" })
	@JoinColumn({ name: "account_id" })
	account: Account;

	@Column({ type: "uuid", name: "account_id" })
	accountId: string;

	@ManyToOne(() => Subscription, { nullable: true, onDelete: "SET NULL" })
	@JoinColumn({ name: "subscription_id" })
	subscription: Subscription | null;

	@Column({ type: "uuid", name: "subscription_id", nullable: true })
	subscriptionId: string | null;

	@ManyToOne(() => SubscriptionPlan, { nullable: true })
	@JoinColumn({ name: "plan_id" })
	plan: SubscriptionPlan | null;

	@Column({ type: "uuid", name: "plan_id", nullable: true })
	planId: string | null;

	@Index()
	@Column({ type: "varchar", name: "transaction_reference", unique: true })
	transactionReference: string;

	@Index()
	@Column({
		type: "enum",
		enum: TransactionStatus,
		default: TransactionStatus.PENDING,
	})
	status: TransactionStatus;

	@Column({ type: "bigint" })
	amount: number;

	@Column({ type: "varchar", default: "NGN" })
	currency: string;

	@Column({ type: "varchar", name: "payment_method", default: "Paystack" })
	paymentMethod: string;

	@Column({ type: "varchar", name: "paystack_customer_code", nullable: true })
	paystackCustomerCode: string | null;

	@Column({ type: "jsonb", nullable: true })
	metadata: Record<string, any> | null;
}
