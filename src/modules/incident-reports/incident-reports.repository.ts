import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { IncidentReport, IncidentStatus } from "./entities/incident-report.entity";
import { Tickets } from "@/modules/tickets/entities/ticket.entity";

@Injectable()
export class IncidentReportsRepository {
	constructor(
		@InjectRepository(IncidentReport)
		private readonly incidents: Repository<IncidentReport>,
		@InjectRepository(Tickets)
		private readonly tickets: Repository<Tickets>,
	) {}

	async save(incident: IncidentReport): Promise<IncidentReport> {
		return this.incidents.save(incident);
	}

	create(input: Partial<IncidentReport>): IncidentReport {
		return this.incidents.create(input);
	}

	async findById(id: string): Promise<IncidentReport | null> {
		return this.incidents.findOne({
			where: { id },
			relations: ["account", "assignedAgent"],
		});
	}

	async search(filter: {
		accountId?: string;
		assignedAgentId?: string;
		assigned?: boolean;
		status?: IncidentStatus;
		page: number;
		limit: number;
	}): Promise<{ rows: IncidentReport[]; total: number }> {
		const qb = this.incidents
			.createQueryBuilder("incident")
			.leftJoinAndSelect("incident.account", "account")
			.leftJoinAndSelect("incident.assignedAgent", "agent")
			.orderBy("incident.createdAt", "DESC")
			.skip((filter.page - 1) * filter.limit)
			.take(filter.limit);

		if (filter.accountId) {
			qb.andWhere("account.id = :accountId", {
				accountId: filter.accountId,
			});
		}
		if (filter.assignedAgentId) {
			qb.andWhere("agent.id = :assignedAgentId", {
				assignedAgentId: filter.assignedAgentId,
			});
		}
		if (filter.assigned === false) {
			qb.andWhere("incident.assigned_agent_id IS NULL");
		}
		if (filter.assigned === true) {
			qb.andWhere("incident.assigned_agent_id IS NOT NULL");
		}
		if (filter.status) {
			qb.andWhere("incident.status = :status", { status: filter.status });
		}

		const [rows, total] = await qb.getManyAndCount();
		return { rows, total };
	}

	async ticketStatuses(ticketIds: string[]): Promise<Map<string, string>> {
		const ids = ticketIds.filter(Boolean);
		if (!ids.length) return new Map();
		const tickets = await this.tickets.find({
			where: { ticketId: In(ids) },
			select: ["ticketId", "status"],
		});
		return new Map(tickets.map((ticket) => [ticket.ticketId, ticket.status]));
	}

	async findTicket(ticketId: string): Promise<Tickets | null> {
		return this.tickets.findOne({
			where: { ticketId },
			relations: ["createdFor"],
		});
	}

	async findByTicketIds(ticketIds: string[]): Promise<IncidentReport[]> {
		if (!ticketIds.length) return [];
		return this.incidents.find({ where: { ticketId: In(ticketIds) } });
	}

	async closeByTicketId(ticketId: string): Promise<void> {
		await this.incidents.update({ ticketId }, { status: "CLOSED" });
	}
}
