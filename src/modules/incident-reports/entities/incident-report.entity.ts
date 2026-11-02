import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "@/shared/entity/base.entity";
import { Account } from "@/modules/accounts/entities/account.entity";
import { User } from "@/modules/users/entities/user.entity";

export type IncidentStatus = "OPEN" | "CLOSED";

@Entity({ name: "incident_reports" })
export class IncidentReport extends BaseEntity {
	@Index({ unique: true })
	@Column({ type: "varchar", unique: true })
	reference: string;

	@ManyToOne(() => Account, { onDelete: "CASCADE" })
	@JoinColumn({ name: "account_id" })
	account: Account;

	@Column({ type: "varchar", default: "OPEN" })
	status: IncidentStatus;

	@Column({ type: "varchar" })
	severity: string;

	@Column({ type: "varchar", name: "incident_type" })
	incidentType: string;

	@Column({ type: "varchar" })
	ongoing: string;

	@Column({ type: "varchar" })
	name: string;

	@Column({ type: "varchar" })
	organization: string;

	@Column({ type: "varchar" })
	phone: string;

	@Column({ type: "varchar" })
	email: string;

	@Column({ type: "varchar", name: "detected_at", nullable: true })
	detectedAt?: string | null;

	@Column({ type: "text", name: "affected_systems", nullable: true })
	affectedSystems?: string | null;

	@Column({ type: "text" })
	description: string;

	@ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
	@JoinColumn({ name: "assigned_agent_id" })
	assignedAgent?: User | null;

	@Column({ type: "varchar", name: "ticket_id", nullable: true })
	ticketId?: string | null;

	@Column({ type: "uuid", name: "created_by_staff_id", nullable: true })
	createdByStaffId?: string | null;
}
