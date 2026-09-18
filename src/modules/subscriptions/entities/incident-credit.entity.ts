import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";
import { Account } from "@/modules/accounts/entities/account.entity";
import { SubscriptionPlan } from "./subscription-plan.entity";
import { SubscriptionTransaction } from "./transaction.entity";

export enum IncidentCreditStatus {
	AVAILABLE = "available",
	USED = "used",
	EXPIRED = "expired",
}

@Entity({ name: "incident_credits" })
export class IncidentCredit extends BaseEntity {
	@ManyToOne(() => Account, { onDelete: "CASCADE" })
	@JoinColumn({ name: "account_id" })
	account: Account;

	@Index()
	@Column({ type: "uuid", name: "account_id" })
	accountId: string;

	@ManyToOne(() => SubscriptionPlan, { nullable: true })
	@JoinColumn({ name: "plan_id" })
	plan: SubscriptionPlan | null;

	@Column({ type: "uuid", name: "plan_id", nullable: true })
	planId: string | null;

	@ManyToOne(() => SubscriptionTransaction, { nullable: true })
	@JoinColumn({ name: "transaction_id" })
	transaction: SubscriptionTransaction | null;

	@Column({ type: "uuid", name: "transaction_id", nullable: true })
	transactionId: string | null;

	@Column({ type: "int", name: "incidents_granted", default: 1 })
	incidentsGranted: number;

	@Column({ type: "int", name: "incidents_used", default: 0 })
	incidentsUsed: number;

	@Index()
	@Column({
		type: "enum",
		enum: IncidentCreditStatus,
		default: IncidentCreditStatus.AVAILABLE,
	})
	status: IncidentCreditStatus;

	@Column({ type: "varchar", name: "ticket_id", nullable: true })
	ticketId: string | null;

	@Column({ type: "jsonb", nullable: true })
	metadata: Record<string, any> | null;
}
