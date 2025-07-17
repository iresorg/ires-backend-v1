import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, QueryRunner } from "typeorm";
import { Tickets } from "./entities/ticket.entity";
import {
	ITicket,
	ITicketCreate,
	ITicketLifecycle,
	IUpdateTicket,
	TicketStatus,
} from "./interfaces/ticket.interface";
import { TicketLifecycle } from "./entities/ticket-lifecycle.entity";
import { Role } from "../users/enums/role.enum";
import { TDatabaseTransaction } from "@/shared/database/datasource";

@Injectable()
export class TicketsRepository {
	constructor(
		@InjectRepository(Tickets)
		private readonly repo: Repository<Tickets>,
		private readonly dataSource: DataSource,
	) {}

	async createTicket(
		body: ITicketCreate,
		trx?: TDatabaseTransaction,
	): Promise<ITicket> {
		const repo = this.getRepo(trx);

		return repo.save({
			...body,
			createdBy: {
				id: body.createdById,
			},
			category: {
				id: body.categoryId,
			},
			subCategory: {
				id: body.subCategoryId,
			},
		});
	}

	async getTicketById(
		ticketId: string,
		trx?: TDatabaseTransaction,
	): Promise<ITicket | null> {
		const repo = this.getRepo(trx);
		const ticket = await repo.findOne({
			where: { ticketId },
			relations: {
				createdBy: true,
				category: true,
				subCategory: true,
			},
		});

		return ticket ? this.mapEntityToITicket(ticket) : null;
	}

	private getRepo(trx?: TDatabaseTransaction) {
		if (trx) {
			return trx.getContext().manager.getRepository(Tickets);
		}

		return this.repo;
	}

	async getTickets(trx?: TDatabaseTransaction): Promise<ITicket[]> {
		const repo = this.getRepo(trx);
		const tickets = await repo.find({
			relations: {
				createdBy: true,
				category: true,
				subCategory: true,
				assignedResponder: true,
			},
		});
		console.log(tickets);
		return tickets.map((ticket) => this.mapEntityToITicket(ticket));
	}

	async updateTicket(
		ticketId: string,
		updateBody: Partial<IUpdateTicket>,
		trx?: TDatabaseTransaction,
	): Promise<void> {
		const repo = this.getRepo(trx);
		await repo.save({
			ticketId,
			...updateBody,
			...(updateBody.assignedResponderId && {
				assignedResponder: { id: updateBody.assignedResponderId },
			}),
		});
	}

	/**
	 * Maps a Tickets entity to the ITicket interface.
	 */
	private mapEntityToITicket(ticket: Tickets): ITicket {
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
			createdBy: {
				id: ticket.createdBy?.id,
				firstName: ticket.createdBy?.firstName,
				lastName: ticket.createdBy?.lastName,
				role: ticket.createdBy?.role,
			},
			assignedResponder: {
				id: ticket.assignedResponder?.id,
				firstName: ticket.assignedResponder?.firstName,
				lastName: ticket.assignedResponder?.lastName,
				role: ticket.assignedResponder?.role,
			},
			category: {
				id: ticket.category?.id,
				name: ticket.category?.name,
				createdAt: ticket.category?.createdAt,
			},
			subCategory: {
				id: ticket.subCategory?.id,
				name: ticket.subCategory?.name,
				createdAt: ticket.subCategory?.createdAt,
			},
		};
	}
}
