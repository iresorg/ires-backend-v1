import { Injectable } from "@nestjs/common";
import {
	ITicket,
	ITicketCreate,
	ITicketLifecycle,
	TicketStatus,
} from "./interfaces/ticket.interface";
import { ITicketRepository } from "./interfaces/ticket-repo.interface";
import constants from "./constant";
import { Inject } from "@nestjs/common";
import { UsersService } from "@/modules/users/users.service";
import {
	TicketNotFoundError,
	TicketEscalationReasonRequiredError,
} from "@/shared/errors/ticket.errors";
import { AgentsService } from "@/modules/agents/agents.service";
import { RespondersService } from "@/modules/responders/responders.service";
import { AgentNotFoundError, UserNotFoundError } from "@/shared/errors";
import { ResponderNotFoundError } from "@/shared/errors/responder.errors";

@Injectable()
export class TicketsService {
	constructor(
		@Inject(constants.TICKET_REPOSITORY)
		private readonly ticketsRepository: ITicketRepository,
		private readonly usersService: UsersService,
		private readonly agentsService: AgentsService,
		private readonly respondersService: RespondersService,
	) {}

	async createTicket(
		body: Omit<ITicketCreate, "ticketId">,
	): Promise<ITicket> {
		const ticketId = this.generateTicketId();
		const ticketCreateObj = { ...body, ticketId };
		await this.validateActor(body.actorType, body.actorId);
		const ticket =
			await this.ticketsRepository.createTicket(ticketCreateObj);

		return this.ticketsRepository.getTicketById(ticket.ticketId);
	}

	async validateActor(
		actorType: "admin" | "agent" | "responder",
		actorId: string,
	) {
		if (actorType === "admin") {
			const user = await this.usersService.findOne({
				id: actorId,
			});
			if (!user) throw new UserNotFoundError();
		} else if (actorType === "agent") {
			const agent = await this.agentsService.findOne(actorId);

			if (!agent)
				throw new AgentNotFoundError(
					"This agent account does not exist. Please contact support.",
				);
		} else if (actorType === "responder") {
			const responder = await this.respondersService.findOne(actorId);

			if (!responder) throw new ResponderNotFoundError();
		}
	}

	async getTicketById(ticketId: string): Promise<ITicket | null> {
		return this.ticketsRepository.getTicketById(ticketId);
	}

	async getTickets(): Promise<ITicket[]> {
		return this.ticketsRepository.getTickets();
	}

	/**
	 * Updates a ticket and creates a lifecycle event if status changes.
	 * @param ticketId The ticket ID
	 * @param updateBody The updated ticket data (partial)
	 * @param performedBy The user ID performing the update
	 * @param context Optional context: { notes, assignedResponderId, escalationReason, escalatedToUserId }
	 */
	async updateTicket(
		ticketId: string,
		updateBody: Partial<ITicket>,
		performedBy: string,
		context?: {
			notes?: string;
			assignedResponderId?: string;
			escalationReason?: string;
			escalatedToUserId?: string;
		},
	): Promise<ITicket> {
		// Check for ticket existence before updating
		const existing = await this.ticketsRepository.getTicketById(ticketId);
		if (!existing) {
			throw new TicketNotFoundError();
		}

		// Check for escalation reason if status is ESCALATED
		if (
			updateBody.status === TicketStatus.ESCALATED &&
			!context?.escalationReason
		) {
			throw new TicketEscalationReasonRequiredError();
		}

		const result = await this.ticketsRepository.updateTicket(
			existing,
			updateBody,
			performedBy,
			context,
		);
		if (!result) {
			throw new TicketNotFoundError();
		}
		return result;
	}

	async getTicketLifecycle(ticketId: string): Promise<ITicketLifecycle[]> {
		return this.ticketsRepository.getTicketLifecycle(ticketId);
	}

	generateTicketId(): string {
		return `iRS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
	}
}
