import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
	IncidentCredit,
	IncidentCreditStatus,
} from "../entities/incident-credit.entity";
import { TDatabaseTransaction } from "@/shared/database/datasource";

@Injectable()
export class IncidentCreditsRepository {
	constructor(
		@InjectRepository(IncidentCredit)
		private readonly credits: Repository<IncidentCredit>,
	) {}

	private getRepo(trx?: TDatabaseTransaction) {
		if (trx) {
			return trx.getContext().manager.getRepository(IncidentCredit);
		}
		return this.credits;
	}

	async createCredit(
		data: Partial<IncidentCredit>,
		trx?: TDatabaseTransaction,
	): Promise<IncidentCredit> {
		const repo = this.getRepo(trx);
		return repo.save(repo.create(data));
	}

	async findAvailableByAccountId(
		accountId: string,
		trx?: TDatabaseTransaction,
	): Promise<IncidentCredit | null> {
		const repo = this.getRepo(trx);
		return repo.findOne({
			where: {
				accountId,
				status: IncidentCreditStatus.AVAILABLE,
			},
			order: { createdAt: "ASC" },
		});
	}

	async countAvailableByAccountId(
		accountId: string,
		trx?: TDatabaseTransaction,
	): Promise<number> {
		const repo = this.getRepo(trx);
		return repo.count({
			where: {
				accountId,
				status: IncidentCreditStatus.AVAILABLE,
			},
		});
	}

	async findAccountIdsWithAvailableCredits(): Promise<string[]> {
		const rows = await this.credits
			.createQueryBuilder("credit")
			.select("DISTINCT credit.account_id", "accountId")
			.where("credit.status = :status", {
				status: IncidentCreditStatus.AVAILABLE,
			})
			.getRawMany<{ accountId: string }>();

		return rows.map((row) => row.accountId);
	}

	async consumeCredit(
		creditId: string,
		ticketId: string,
		trx?: TDatabaseTransaction,
	): Promise<void> {
		const repo = this.getRepo(trx);
		await repo.update(
			{ id: creditId },
			{
				status: IncidentCreditStatus.USED,
				incidentsUsed: 1,
				ticketId,
			},
		);
	}

	async findByTransactionId(
		transactionId: string,
	): Promise<IncidentCredit | null> {
		return this.credits.findOne({ where: { transactionId } });
	}
}
