import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, QueryRunner } from "typeorm";
import { Tickets } from "./entities/ticket.entity";
import { ITicketRepository } from "./interfaces/ticket-repo.interface";
import {
	ITicket,
	ITicketCreate,
	ITicketLifecycle,
	TicketStatus,
} from "./interfaces/ticket.interface";
import { TicketLifecycle } from "./entities/ticket-lifecycle.entity";
import { Role } from "../users/enums/role.enum";

@Injectable()
export class TicketsRepository implements ITicketRepository {
	constructor(
		@InjectRepository(Tickets)
		private readonly ticketsRepository: Repository<Tickets>,
		@InjectRepository(TicketLifecycle)
		private readonly ticketLifecycleRepository: Repository<TicketLifecycle>,
		private readonly dataSource: DataSource,
	) {}

	async createTicket(body: ITicketCreate): Promise<ITicket> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Save ticket
			let ticket = this.ticketsRepository.create({
				...body,
				...(body.actorType === "agent" && {
					createdByAgent: { agentId: body.actorId },
				}),
				...(body.actorType === "responder" && {
					createdByResponder: {
						responderId: body.actorId,
					},
				}),
				...(body.actorType === "admin" && {
					createdByUser: { id: body.actorId },
				}),
			});

			ticket = await queryRunner.manager.save(Tickets, ticket);

			// Save lifecycle
			const lifecycle = this.ticketLifecycleRepository.create({
				ticket,
				action: TicketStatus.CREATED,
				performerRole: body.creatorRole,
				performedByUser: ticket.createdByUser || undefined,
				performedByResponder: ticket.createdByResponder || undefined,
				notes: ticket.internalNotes || null,
			});
			await queryRunner.manager.save(TicketLifecycle, lifecycle);

			await queryRunner.commitTransaction();

			return this.mapEntityToITicket(ticket);
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}
	}

	async getTicketById(ticketId: string): Promise<ITicket | null> {
		const ticket = await this.ticketsRepository.findOne({
			where: { ticketId },
			relations: {
				createdByAgent: true,
				createdByResponder: true,
				createdByUser: true,
				assignedResponder: true,
			},
		});
		return ticket ? this.mapEntityToITicket(ticket) : null;
	}

	async getTickets(): Promise<ITicket[]> {
		const tickets = await this.ticketsRepository.find({
			relations: {
				createdByAgent: true,
				createdByResponder: true,
				createdByUser: true,
			},
		});
		return tickets.map((ticket) => this.mapEntityToITicket(ticket));
	}

	private handleStatusTransition(
		existingTicket: ITicket,
		updateBody: Partial<ITicket>,
		context?: {
			notes?: string;
			assignedResponderId?: string;
			escalationReason?: string;
			escalatedToResponderId?: string;
		},
	): {
		prevStatus: TicketStatus;
		nextStatus: TicketStatus;
		lifecycleNotes: string | null;
	} {
		const prevStatus: TicketStatus = existingTicket.status;
		const nextStatus: TicketStatus = updateBody.status ?? prevStatus;
		let lifecycleNotes = context?.notes || null;

		// PENDING logic
		if (nextStatus === TicketStatus.PENDING) {
			lifecycleNotes = lifecycleNotes || "Ticket marked as pending";
		}

		// ANALYSING logic
		if (nextStatus === TicketStatus.ANALYSING) {
			lifecycleNotes = context?.notes
				? `Analysis started: ${context.notes}`
				: "Analysis started";
		}

		// ASSIGNED logic
		if (
			nextStatus === TicketStatus.ASSIGNED &&
			context?.assignedResponderId
		) {
			lifecycleNotes =
				`Assigned responder: ${context.assignedResponderId}` +
				(lifecycleNotes ? ` | ${lifecycleNotes}` : "");
		}

		// RESPONDING logic
		if (nextStatus === TicketStatus.RESPONDING) {
			lifecycleNotes = context?.notes
				? `Response initiated: ${context.notes}`
				: "Response initiated";
		}

		// RESOLVED logic
		if (nextStatus === TicketStatus.RESOLVED) {
			lifecycleNotes = context?.notes
				? `Ticket resolved: ${context.notes}`
				: "Ticket resolved";
		}

		// CLOSED logic
		if (nextStatus === TicketStatus.CLOSED) {
			lifecycleNotes = lifecycleNotes || "Ticket closed";
		}

		// ESCALATED logic (no business logic, just formatting notes)
		if (nextStatus === TicketStatus.ESCALATED) {
			lifecycleNotes = context?.notes
				? `Escalated: ${context.notes}`
				: null;
			if (context?.escalatedToResponderId) {
				lifecycleNotes += ` | Escalated to user: ${context.escalatedToResponderId}`;
			}
		}

		return { prevStatus, nextStatus, lifecycleNotes };
	}

	private async createLifecycleEventIfNeeded(
		queryRunner: QueryRunner,
		updatedTicket: Tickets,
		prevStatus: TicketStatus,
		nextStatus: TicketStatus,
		action: TicketStatus,
		performerRole: Role,
		performedBy: {
			agentId?: string;
			responderId?: string;
			userId?: string;
		},
		notes: string | null,
	): Promise<void> {
		if (
			prevStatus !== nextStatus ||
			nextStatus === TicketStatus.ESCALATED ||
			nextStatus === TicketStatus.RESPONDING ||
			nextStatus === TicketStatus.ANALYSING
		) {
			const lifecycle = this.ticketLifecycleRepository.create({
				ticket: updatedTicket,
				performerRole,
				action,
				performedByUser: { id: performedBy.userId },
				performedByResponder: { responderId: performedBy.responderId },
				performedByAgent: { agentId: performedBy.agentId },
				notes,
			});
			await queryRunner.manager.save(TicketLifecycle, lifecycle);
		}
	}

	async updateTicket(
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
			escalatedToResponderId?: string;
		},
	): Promise<ITicket | null> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			const { prevStatus, nextStatus, lifecycleNotes } =
				this.handleStatusTransition(
					existingTicket,
					updateBody,
					context,
				);

			const updatedTicket = await queryRunner.manager.save(Tickets, {
				...existingTicket,
				...updateBody,
				assignedResponder: { responderId: context.assignedResponderId },
			});

			await this.createLifecycleEventIfNeeded(
				queryRunner,
				updatedTicket,
				prevStatus,
				nextStatus,
				action,
				performerRole,
				{
					agentId: performedBy.agentId,
					responderId: performedBy.responderId,
					userId: performedBy.userId,
				},
				lifecycleNotes,
			);
			await queryRunner.commitTransaction();
			return this.mapEntityToITicket(updatedTicket);
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}
	}

	async getTicketLifecycle(ticketId: string): Promise<ITicketLifecycle[]> {
		const lifecycle = await this.ticketLifecycleRepository.find({
			where: { ticket: { ticketId } },
			relations: [
				"performedByUser",
				"performedByResponder",
				"performedByAgent",
			],
			order: {
				createdAt: "DESC",
			},
		});

		return lifecycle.map((lifecycle) => {
			let performedBy: ITicketLifecycle["performedBy"];

			if (lifecycle.performedByUser) {
				performedBy = {
					id: lifecycle.performedByUser.id,
					firstName: lifecycle.performedByUser.firstName,
					lastName: lifecycle.performedByUser.lastName,
					role: lifecycle.performerRole,
				};
			} else if (lifecycle.performedByAgent) {
				performedBy = {
					id: lifecycle.performedByAgent.agentId,
					role: lifecycle.performerRole,
				};
			} else if (lifecycle.performedByResponder) {
				performedBy = {
					id: lifecycle.performedByResponder.responderId,
					role: lifecycle.performerRole,
				};
			} else {
				performedBy = {
					id: "",
					role: lifecycle.performerRole,
				};
			}

			return {
				id: lifecycle.id,
				ticketId,
				action: lifecycle.action,
				performedBy,
				notes: lifecycle.notes,
				createdAt: lifecycle.createdAt,
			};
		});
	}

	/**
	 * Maps a Tickets entity to the ITicket interface.
	 */
	private mapEntityToITicket(ticket: Tickets): ITicket {
		let createdBy: ITicket["createdBy"];
		if (ticket.createdByUser) {
			createdBy = {
				id: ticket.createdByUser?.id,
				firstName: ticket.createdByUser?.firstName,
				lastName: ticket.createdByUser?.lastName,
				role: ticket.createdByUser?.role,
			};
		} else if (ticket.createdByAgent) {
			createdBy = {
				id: ticket.createdByAgent?.agentId,
				role: ticket.creatorRole,
			};
		} else if (ticket.createdByResponder) {
			createdBy = {
				id: ticket.createdByResponder?.responderId,
				role: ticket.creatorRole,
			};
		} else {
			createdBy = {
				id: "",
				role: ticket.creatorRole,
			};
		}

		return {
			ticketId: ticket.ticketId,
			title: ticket.title,
			tier: ticket.tier,
			description: ticket.description,
			status: ticket.status,
			severity: ticket.severity,
			location: ticket.location,
			victimInformation: ticket.victimInformation,
			attachments: ticket.attachments,
			reporterName: ticket.reporterName,
			contactInformation: ticket.contactInformation,
			internalNotes: ticket.internalNotes,
			createdAt: ticket.createdAt,
			updatedAt: ticket.updatedAt,
			createdBy,
			assignedResponder: {
				id: ticket.assignedResponder?.responderId,
				type: ticket.assignedResponder?.type,
			},
		};
	}
}
