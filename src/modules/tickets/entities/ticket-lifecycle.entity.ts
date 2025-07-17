import { BaseEntity } from "@/shared/entity/base.entity";
import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { Tickets } from "./ticket.entity";
import { User } from "@/modules/users/entities/user.entity";
import { TicketStatus } from "../interfaces/ticket.interface";

@Entity()
export class TicketLifecycle extends BaseEntity {
	@ManyToOne(() => Tickets)
	@JoinColumn({
		name: "ticket_id",
		foreignKeyConstraintName: "FK_ticket_lifecycle_ticket_id",
	})
	ticket: Tickets;

	@Column("varchar")
	action: TicketStatus;

	@ManyToOne(() => User, { nullable: true })
	@JoinColumn({ name: "performed_by_user_id" })
	performedBy: User;

	@Column("text", { nullable: true })
	notes: string;
}
