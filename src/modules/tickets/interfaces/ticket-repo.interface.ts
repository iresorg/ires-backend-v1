import { Role } from "@/modules/users/enums/role.enum";
import {
	ITicket,
	ITicketCreate,
	ITicketLifecycle,
	TicketStatus,
} from "./ticket.interface";

export interface ITicketRepository {
	createTicket(ticket: ITicketCreate): Promise<ITicket>;
	getTicketById(ticketId: string): Promise<ITicket | null>;
	getTickets(): Promise<ITicket[]>;
	/**
	 * Updates a ticket and automatically creates a lifecycle event if the status changes.
	 * @param existingTicket The existing ticket entity
	 * @param updateBody The updated ticket data
	 * @param performedBy The user performing the update
	 * @param context Optional context: { notes, assignedResponderId, escalationReason, escalatedToUserId }
	 */
	updateTicket(
		existingTicket: ITicket,
		updateBody: Partial<ITicket>,
		action: TicketStatus,
		performerRole: Role,
		performedBy: {
			agentId?: string;
			responderId?: string;
			userId?: string;
		},
		context?: {
			notes?: string;
			assignedResponderId?: string;
			escalationReason?: string;
			escalatedToUserId?: string;
		},
	): Promise<ITicket>;
	getTicketLifecycle(ticketId: string): Promise<ITicketLifecycle[]>;
}
