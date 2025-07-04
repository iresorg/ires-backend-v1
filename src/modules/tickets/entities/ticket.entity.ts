import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
} from "typeorm";
import {
	TicketSeverity,
	TicketStatus,
	ContactInformation,
	VictimInformation,
} from "../interfaces/ticket.interface";
import { User } from "@/modules/users/entities/user.entity";
import { Agent } from "@/modules/agents/entities/agent.entity";
import { Responder } from "@/modules/responders/entities/responder.entity";
import { Role } from "@/modules/users/enums/role.enum";

@Entity()
export class Tickets {
	@PrimaryColumn("varchar", { name: "ticket_id", unique: true })
	ticketId: string;

	@Column("varchar")
	title: string;

	@Column("varchar")
	type: string;

	@Column("text")
	description: string;

	@Column("varchar", { default: TicketStatus.CREATED })
	status: TicketStatus;

	@Column("varchar", { nullable: true })
	severity: TicketSeverity;

	@Column("varchar")
	location: string;

	@Column("jsonb", { nullable: true, name: "victim_information" })
	victimInformation: VictimInformation;

	@Column("varchar", { nullable: true, array: true })
	attachments: string[];

	@Column("varchar")
	reporterName: string;

	@Column("jsonb", { nullable: true, name: "contact_information" })
	contactInformation: ContactInformation;

	@Column("text", { nullable: true, name: "internal_notes" })
	internalNotes: string;

	@Column("varchar")
	creatorRole: Role;

	@ManyToOne(() => User, { nullable: true })
	@JoinColumn({ name: "created_by_user_id" })
	createdByUser: User;

	@ManyToOne(() => Agent, { nullable: true })
	@JoinColumn({ name: "created_by_agent_id" })
	createdByAgent: Agent;

	@ManyToOne(() => Responder, { nullable: true })
	@JoinColumn({ name: "created_by_responder_id" })
	createdByResponder: Responder;

	@CreateDateColumn({
		name: "created_at",
		default: "NOW()",
	})
	createdAt: Date;

	@UpdateDateColumn({
		name: "updated_at",
		default: () => "NOW()",
	})
	updatedAt: Date;
	// TODO: Add responder columnn
}
