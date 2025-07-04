import { ITicket, ITicketCreate, ITicketLifecycle } from "./ticket.interface";

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
		performedBy: any, // IUser, but import path may vary
		context?: {
			notes?: string;
			assignedResponderId?: string;
			escalationReason?: string;
			escalatedToUserId?: string;
		},
	): Promise<ITicket>;
	getTicketLifecycle(ticketId: string): Promise<ITicketLifecycle[]>;
}
