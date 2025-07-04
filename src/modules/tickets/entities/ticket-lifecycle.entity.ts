import { BaseEntity } from "@/shared/entity/base.entity";
import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { Tickets } from "./ticket.entity";
import { User } from "@/modules/users/entities/user.entity";
import { Responder } from "@/modules/responders/entities/responder.entity";
import { TicketLifecycleAction } from "../interfaces/ticket.interface";
import { Agent } from "@/modules/agents/entities/agent.entity";

@Entity()
export class TicketLifecycle extends BaseEntity {
	@ManyToOne(() => Tickets)
	@JoinColumn({ name: "ticket_id" })
	ticket: Tickets;

	@Column("varchar")
	action: TicketLifecycleAction;

	@ManyToOne(() => User, { nullable: true })
	@JoinColumn({ name: "performed_by_user_id" })
	performedByUser: User;

	@ManyToOne(() => Responder, { nullable: true })
	@JoinColumn({ name: "performed_by_responder_id" })
	performedByResponder: Responder;

	@ManyToOne(() => Agent, { nullable: true })
	@JoinColumn({ name: "performed_by_agent_id" })
	performedByAgent: Agent;

	@Column("text", { nullable: true })
	notes: string;
}
