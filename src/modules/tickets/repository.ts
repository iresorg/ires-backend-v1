import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, QueryRunner, DeepPartial } from "typeorm";
import { Tickets } from "./entities/ticket.entity";
import { ITicketRepository } from "./interfaces/ticket-repo.interface";
import {
	ITicket,
	ITicketCreate,
	ITicketLifecycle,
	TicketLifecycleAction,
	TicketStatus,
} from "./interfaces/ticket.interface";
import { TicketLifecycle } from "./entities/ticket-lifecycle.entity";

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
				action: TicketLifecycleAction.CREATE,
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

	private async getExistingTicket(
		queryRunner: QueryRunner,
		ticketId: string,
	): Promise<Tickets> {
		const existingTicket = await queryRunner.manager.findOne(Tickets, {
			where: { ticketId },
		});
		if (!existingTicket) return null;
		return existingTicket;
	}

	private handleStatusTransition(
		existingTicket: Tickets,
		updateBody: Partial<Tickets>,
		context?: {
			notes?: string;
			assignedResponderId?: string;
			escalationReason?: string;
			escalatedToUserId?: string;
		},
	): {
		prevStatus: TicketStatus;
		nextStatus: TicketStatus;
		lifecycleNotes: string | null;
	} {
		const prevStatus: TicketStatus = existingTicket.status;
		const nextStatus: TicketStatus = updateBody.status ?? prevStatus;
		let lifecycleNotes = context?.notes || null;

		// Escalation logic (no business logic, just formatting notes)
		if (nextStatus === TicketStatus.ESCALATED) {
			lifecycleNotes = context?.escalationReason
				? `Escalated: ${context.escalationReason}`
				: null;
			if (context?.escalatedToUserId) {
				lifecycleNotes += ` | Escalated to user: ${context.escalatedToUserId}`;
			}
		}

		// Responding logic
		if (
			nextStatus === TicketStatus.RESPONDING &&
			context?.assignedResponderId
		) {
			lifecycleNotes =
				`Assigned responder: ${context.assignedResponderId}` +
				(lifecycleNotes ? ` | ${lifecycleNotes}` : "");
		}

		return { prevStatus, nextStatus, lifecycleNotes };
	}

	private async saveTicketUpdate(
		queryRunner: QueryRunner,
		existingTicket: Tickets,
		updateBody: Partial<Tickets>,
	): Promise<Tickets> {
		return queryRunner.manager.save(Tickets, {
			...existingTicket,
			...updateBody,
		});
	}

	private async createLifecycleEventIfNeeded(
		queryRunner: QueryRunner,
		updatedTicket: Tickets,
		prevStatus: TicketStatus,
		nextStatus: TicketStatus,
		performedBy: {
			agentId?: string;
			responderId?: string;
			userId?: string;
		},
		notes: string | null,
	): Promise<void> {
		const action = TicketLifecycleAction.UPDATE;
		if (
			prevStatus !== nextStatus ||
			nextStatus === TicketStatus.ESCALATED ||
			nextStatus === TicketStatus.RESPONDING ||
			nextStatus === TicketStatus.ANALYSING
		) {
			const lifecycle = this.ticketLifecycleRepository.create({
				ticket: updatedTicket,
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
	): Promise<ITicket | null> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Fetch the Tickets entity from the database
			const dbTicket = await queryRunner.manager.findOne(Tickets, {
				where: { ticketId: existingTicket.ticketId },
				relations: {
					createdByAgent: true,
					createdByResponder: true,
					createdByUser: true,
				},
			});
			if (!dbTicket) {
				await queryRunner.rollbackTransaction();
				await queryRunner.release();
				return null;
			}

			const { prevStatus, nextStatus, lifecycleNotes } =
				this.handleStatusTransition(
					dbTicket,
					updateBody as Partial<Tickets>,
					context,
				);
			const updatedTicket = await this.saveTicketUpdate(
				queryRunner,
				dbTicket,
				updateBody as Partial<Tickets>,
			);
			await this.createLifecycleEventIfNeeded(
				queryRunner,
				updatedTicket,
				prevStatus,
				nextStatus,
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
			relations: ["performedByUser", "performedByResponder"],
			select: [
				"action",
				"performedByUser",
				"performedByResponder",
				"notes",
				"createdAt",
			],
		});

		return lifecycle.map((lifecycle) => ({
			ticketId,
			action: lifecycle.action,
			performedByUser: lifecycle.performedByUser,
			performedByResponder: lifecycle.performedByResponder,
			notes: lifecycle.notes,
			createdAt: lifecycle.createdAt,
		}));
	}

	/**
	 * Maps a Tickets entity to the ITicket interface.
	 */
	private mapEntityToITicket(ticket: Tickets): ITicket {
		let createdBy: ITicket["createdBy"];
		if (ticket.createdByUser) {
			createdBy = {
				id: ticket.createdByUser?.id,
				name:
					ticket.createdByUser?.firstName +
					(ticket.createdByUser?.lastName
						? ` ${ticket.createdByUser?.lastName}`
						: ""),
				role: ticket.createdByUser?.role,
			};
		} else if (ticket.createdByAgent) {
			createdBy = {
				id: ticket.createdByAgent?.agentId,
				name: undefined,
				role: ticket.creatorRole,
			};
		} else if (ticket.createdByResponder) {
			createdBy = {
				id: ticket.createdByResponder?.responderId,
				name: undefined,
				role: ticket.creatorRole,
			};
		} else {
			createdBy = {
				id: "",
				name: undefined,
				role: ticket.creatorRole,
			};
		}

		return {
			ticketId: ticket.ticketId,
			title: ticket.title,
			type: ticket.type,
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
		};
	}
}
