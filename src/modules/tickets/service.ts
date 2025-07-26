import { BadRequestException, Injectable } from "@nestjs/common";
import {
	ITicket,
	ITicketCreate,
	ITicketLifecycle,
	ITicketSummary,
	TicketSeverity,
	TicketStatus,
	TicketTiers,
} from "./interfaces/ticket.interface";
import { UsersService } from "@/modules/users/users.service";
import { TicketNotFoundError } from "@/shared/errors/ticket.errors";
import { EmailService } from "@/shared/email/service";
import { Role } from "../users/enums/role.enum";
import { TicketsRepository } from "./repository";
import {
	TDatabaseService,
	TDatabaseTransaction,
} from "@/shared/database/datasource";
import { TicketLifecycleRepository } from "./ticket-lifecycle.repository";
import { AssignResponder, ReassignTicket } from "./types";
import { PaginatedResponse, PaginationQuery } from "@/shared/utils/pagination";

@Injectable()
export class TicketsService {
	constructor(
		private readonly ticketsRepository: TicketsRepository,
		private readonly ticketLifecyleRepo: TicketLifecycleRepository,
		private readonly usersService: UsersService,
		private readonly emailService: EmailService,
		private readonly databaseService: TDatabaseService,
	) {}

	async createTicket(
		body: Omit<ITicketCreate, "ticketId">,
	): Promise<ITicket> {
		const ticketId = this.generateTicketId();
		await this.databaseService.withTransaction(async (trx) => {
			await this.ticketsRepository.createTicket(
				{ ...body, ticketId },
				trx,
			);

			await this.ticketLifecyleRepo.create(
				{
					action: TicketStatus.CREATED,
					performedById: body.createdById,
					ticketId,
					notes: body.internalNotes,
				},
				trx,
			);
		});

		const [savedTicket, responderAdmins] = await Promise.all([
			this.ticketsRepository.getTicketById(ticketId),
			this.usersService.findAll({
				role: Role.RESPONDER_ADMIN,
			}),
		]);

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

	async getTicketById(ticketId: string): Promise<ITicket | null> {
		const ticket = await this.ticketsRepository.getTicketById(ticketId);
		if (!ticket) throw new TicketNotFoundError();

		return ticket;
	}

	async getTickets(query: Partial<PaginationQuery & { status: TicketStatus }>): Promise<PaginatedResponse<ITicketSummary>> {
		return this.ticketsRepository.getTickets({ status: query.status }, { limit: query.limit, page: query.page });
	}

	async assignTicket(
		ticketId: string,
		performedById: string,
		body: AssignResponder,
	) {
		const [ticket, responder] = await Promise.all([
			this.getTicketById(ticketId),
			this.usersService.findOne({ id: body.assignedResponderId }),
		]);

		if (ticket.status !== TicketStatus.ANALYSING) {
			throw new BadRequestException(
				"Ticket should be analyzed before assignment",
			);
		}

		await this.databaseService.withTransaction(async (trx) => {
			const lifeCycleNotes =
				`Assigned responder: ${responder.firstName + " " + responder.lastName}` +
				(body.notes ? ` | ${body.notes}` : "");

			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.ASSIGNED,
				performedById,
				lifeCycleNotes,
				trx,
			);
		});
	}

	async startAnalysingTicket(
		ticketId: string,
		performedById: string,
		notes?: string,
	) {
		await this.getTicketById(ticketId);

		await this.databaseService.withTransaction(async (trx) => {
			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.ANALYSING,
				performedById,
				notes,
				trx,
			);
		});
	}

	async startRespondingToTicket(
		ticketId: string,
		performedById: string,
		notes?: string,
	) {
		await this.getTicketById(ticketId);
		await this.databaseService.withTransaction(async (trx) => {
			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.IN_PROGRESS,
				performedById,
				notes,
				trx,
			);
		});
	}

	async escalateTicket(
		ticketId: string,
		performedById: string,
		escalationReason: string,
	) {
		const [ticket, performer, responderAdmins] = await Promise.all([
			this.getTicketById(ticketId),
			this.usersService.findOne({ id: performedById }),
			this.usersService.findAll({ role: Role.RESPONDER_ADMIN }),
		]);

		if (ticket.status !== TicketStatus.IN_PROGRESS) {
			throw new BadRequestException(
				"Ticket has to be in progress before it can be escalated.",
			);
		}

		await this.databaseService.withTransaction(async (trx) => {
			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.ESCALATED,
				performedById,
				escalationReason,
				trx,
			);
		});

		if (responderAdmins.length) {
			await this.emailService.sendTicketEscalatedEmail(
				responderAdmins.map((admin) => admin.email),
				{
					escalatedBy: `${performer.lastName} ${performer.firstName}`,
					escalationReason,
					subject: ticket.title,
					ticketId,
					timestamp: new Date().toLocaleString(),
				},
			);
		}
	}

	async reassignTicket(
		ticketId: string,
		performerById: string,
		body: ReassignTicket,
	) {
		await this.getTicketById(ticketId);
		await this.databaseService.withTransaction(async (trx) => {
			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.REASSIGNED,
				performerById,
				body.notes,
				trx,
				body.assignedResponderId,
				body.severity,
				body.tier,
			);
		});
	}

	async resolveTicket(
		ticketId: string,
		performerById: string,
		notes?: string,
	) {
		await this.getTicketById(ticketId);
		await this.databaseService.withTransaction(async (trx) => {
			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.RESOLVED,
				performerById,
				notes,
				trx,
			);
		});
	}

	async closeTicket(ticketId: string, performerById: string, notes?: string) {
		await this.getTicketById(ticketId);
		await this.databaseService.withTransaction(async (trx) => {
			await this.updateStatusAndLifecycle(
				ticketId,
				TicketStatus.CLOSED,
				performerById,
				notes,
				trx,
			);
		});
	}

	private async updateStatusAndLifecycle(
		ticketId: string,
		status: TicketStatus,
		performedById: string,
		notes?: string,
		trx?: TDatabaseTransaction,
		assignedResponderId?: string,
		severity?: TicketSeverity,
		tier?: TicketTiers,
	) {
		await Promise.all([
			this.ticketsRepository.updateTicket(
				ticketId,
				{ status, assignedResponderId, severity, tier },
				trx,
			),
			this.ticketLifecyleRepo.create(
				{ ticketId, action: status, performedById, notes },
				trx,
			),
		]);
	}

	async getTicketLifecycle(ticketId: string, query: PaginationQuery): Promise<PaginatedResponse<ITicketLifecycle>> {
		return this.ticketLifecyleRepo.getByTicketId(ticketId, query);
	}

	generateTicketId(): string {
		return `iRS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
	}

	async escalationHistory(query: PaginationQuery): Promise<PaginatedResponse<ITicketLifecycle>> {
		return this.ticketLifecyleRepo.getAll(
			{action: TicketStatus.ESCALATED},
			query
		)
	}
}
