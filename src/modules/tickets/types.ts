import {
	TicketSeverity,
	TicketStatus,
	TicketTiers,
} from "./interfaces/ticket.interface";

export interface ICreateTicketLifeCycle {
	ticketId: string;
	action: TicketStatus;
	performedById: string;
	notes?: string;
}

export interface AssignResponder {
	assignedResponderId: string;
	severity: TicketSeverity;
	tier: TicketTiers;
	notes?: string;
}

export interface ReassignTicket {
	assignedResponderId: string;
	severity?: TicketSeverity;
	tier?: TicketTiers;
	notes?: string;
}
