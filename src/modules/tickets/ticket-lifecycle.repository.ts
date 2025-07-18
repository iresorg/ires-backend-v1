import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TicketLifecycle } from "./entities/ticket-lifecycle.entity";
import { Repository } from "typeorm";
import { ITicketLifecycle } from "./interfaces/ticket.interface";
import { ICreateTicketLifeCycle } from "./types";
import { TDatabaseTransaction } from "@/shared/database/datasource";

@Injectable()
export class TicketLifecycleRepository {
	constructor(
		@InjectRepository(TicketLifecycle)
		private readonly repo: Repository<TicketLifecycle>,
	) {}

	async create(body: ICreateTicketLifeCycle, trx?: TDatabaseTransaction) {
		const repo = this.getRepo(trx);

		return repo.save({
			ticket: { ticketId: body.ticketId },
			performedBy: { id: body.performedById },
			action: body.action,
			notes: body.notes,
		});
	}

	private getRepo(trx?: TDatabaseTransaction) {
		if (trx) {
			return trx.getContext().manager.getRepository(TicketLifecycle);
		}

		return this.repo;
	}

	async getByTicketId(
		ticketId: string,
		trx?: TDatabaseTransaction,
	): Promise<ITicketLifecycle[]> {
		const repo = this.getRepo(trx);
		const lifecycle = await repo.find({
			where: { ticket: { ticketId } },
			relations: {
				performedBy: true,
			},
			order: {
				createdAt: "DESC",
			},
		});
		return lifecycle.map((lifecycle) => ({
			id: lifecycle.id,
			ticketId,
			action: lifecycle.action,
			notes: lifecycle.notes,
			createdAt: lifecycle.createdAt,
			performedBy: {
				id: lifecycle.performedBy.id,
				firstName: lifecycle.performedBy.firstName,
				lastName: lifecycle.performedBy.lastName,
				role: lifecycle.performedBy.role,
			},
		}));
	}
}
