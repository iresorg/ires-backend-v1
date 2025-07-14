import { Injectable, UnauthorizedException } from "@nestjs/common";
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
	InappropriateTierError,
} from "@/shared/errors/ticket.errors";
import { AgentsService } from "@/modules/agents/agents.service";
import { RespondersService } from "@/modules/responders/responders.service";
import { AgentNotFoundError, UserNotFoundError } from "@/shared/errors";
import { ResponderNotFoundError } from "@/shared/errors/responder.errors";
import { EmailService } from "@/shared/email/service";
import { Role } from "../users/enums/role.enum";

@Injectable()
export class TicketsService {
	constructor(
		@Inject(constants.TICKET_REPOSITORY)
		private readonly ticketsRepository: ITicketRepository,
		private readonly usersService: UsersService,
		private readonly agentsService: AgentsService,
		private readonly respondersService: RespondersService,
		private readonly emailService: EmailService,
	) {}

	async createTicket(
		body: Omit<ITicketCreate, "ticketId">,
	): Promise<ITicket> {
		await this.validateActor(body.actorType, body.actorId);
		const ticketId = this.generateTicketId();
		const ticket = await this.ticketsRepository.createTicket({
			...body,
			ticketId,
		});
		const savedTicket = await this.ticketsRepository.getTicketById(
			ticket.ticketId,
		);
		const responderAdmins = await this.usersService.findAll({
			role: Role.RESPONDER_ADMIN,
		});

		if (responderAdmins.length) {
			await this.emailService.sendNewTicketEmail(
				responderAdmins.map((admin) => admin.email),
				savedTicket.description,
				{
					id: savedTicket.createdBy.id,
					name: `${savedTicket.createdBy.firstName} ${savedTicket.createdBy.lastName}`,
					role: savedTicket.createdBy.role,
				},
				savedTicket.ticketId,
				savedTicket.title,
				savedTicket.createdAt.toUTCString(),
			);
		}

		return savedTicket;
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
		const ticket = await this.ticketsRepository.getTicketById(ticketId);
		if (!ticket) throw new TicketNotFoundError();

		return ticket;
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
		action: TicketStatus,
		ticketId: string,
		updateBody: Partial<ITicket>,
		performedBy: string,
		performerRole: Role,
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

		if (context.assignedResponderId) {
			const responder = await this.respondersService.findOne(
				context.assignedResponderId,
			);

			if (!responder) throw new ResponderNotFoundError();

			if (responder.type !== updateBody.tier) {
				throw new InappropriateTierError(
					"Tier selected does not tally with responder selected.",
				);
			}
		}

		if (action === TicketStatus.RESPONDING) {
			if (existing.assignedResponder.id !== performedBy) {
				const e = new UnauthorizedException(
					"Only assigned responder can respond to this ticket",
				);
				e.name = "UnauthorisedResponderError";

				throw e;
			}
		}

		const updatedTicket = await this.ticketsRepository.updateTicket(
			existing,
			updateBody,
			action,
			performerRole,
			performerRole === Role.RESPONDER
				? { responderId: performedBy }
				: performerRole === Role.AGENT
					? { agentId: performedBy }
					: { userId: performedBy },
			context,
		);
		if (!updatedTicket) {
			throw new TicketNotFoundError();
		}
		if (updateBody.status === TicketStatus.ESCALATED) {
			// Send a mail to responder admin
			const responderAdmin = await this.usersService.findAll({
				role: Role.RESPONDER_ADMIN,
			});
			await this.emailService.sendTicketEscalatedEmail(
				responderAdmin.map((admin) => admin.email),
				{
					escalatedBy: performedBy,
					escalationReason: context.escalationReason,
					subject: updatedTicket.title,
					ticketId: updatedTicket.ticketId,
					timestamp: updatedTicket.createdAt.toLocaleString(),
				},
			);
		}
		return updatedTicket;
	}

	async getTicketLifecycle(ticketId: string): Promise<ITicketLifecycle[]> {
		return this.ticketsRepository.getTicketLifecycle(ticketId);
	}

	generateTicketId(): string {
		return `iRS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
	}
}
