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
	TicketTiers,
} from "../interfaces/ticket.interface";
import { User } from "@/modules/users/entities/user.entity";
import { TicketCategory } from "@/modules/ticket-categories/entities/ticket-category.entity";
import { TicketSubCategory } from "@/modules/ticket-categories/entities/ticket-sub-category.entity";

@Entity()
export class Tickets {
	@PrimaryColumn("varchar", { name: "ticket_id", unique: true })
	ticketId: string;

	@Column("varchar")
	title: string;

	@Column("text")
	description: string;

	@Column("varchar", { default: TicketStatus.CREATED })
	status: TicketStatus;

	@Column("varchar", { nullable: true })
	severity: TicketSeverity;

	@Column("varchar", { nullable: true })
	tier: TicketTiers;

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

	@ManyToOne(() => User)
	@JoinColumn({
		name: "created_by_user_id",
		foreignKeyConstraintName: "FK_ticket_created_by_user_id",
	})
	createdBy: User;

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

	@ManyToOne(() => User, { nullable: true })
	@JoinColumn({
		name: "assigned_responder_id",
		foreignKeyConstraintName: "FK_ticket_assigned_responder_id",
	})
	assignedResponder: User;

	@ManyToOne(() => TicketCategory, (tc) => tc.tickets, {
		onDelete: "SET NULL",
	})
	@JoinColumn({
		name: "ticket_category_id",
		foreignKeyConstraintName: "FK_ticket_category_id",
	})
	category: TicketCategory;

	@ManyToOne(() => TicketSubCategory, (tsc) => tsc.tickets, {
		onDelete: "SET NULL",
		nullable: true,
	})
	@JoinColumn({
		name: "ticket _sub_category_id",
		foreignKeyConstraintName: "FK_ticket_subcategory_id",
	})
	subCategory: TicketSubCategory;
}
