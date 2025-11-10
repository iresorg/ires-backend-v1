import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SubscriptionTransaction } from "../entities/transaction.entity";
import { TransactionStatus } from "../entities/transaction.entity";

@Injectable()
export class TransactionsRepository {
	constructor(
		@InjectRepository(SubscriptionTransaction)
		private readonly transactions: Repository<SubscriptionTransaction>,
	) {}

	async createTransaction(
		data: Partial<SubscriptionTransaction>,
	): Promise<SubscriptionTransaction> {
		const transaction = this.transactions.create(data);
		return await this.transactions.save(transaction);
	}

	async findByAccountId(
		accountId: string,
	): Promise<SubscriptionTransaction[]> {
		return await this.transactions.find({
			where: { accountId },
			relations: ["plan", "subscription"],
			order: { createdAt: "DESC" },
		});
	}

	async findByReference(
		reference: string,
	): Promise<SubscriptionTransaction | null> {
		return await this.transactions.findOne({
			where: { transactionReference: reference },
			relations: ["plan", "subscription"],
		});
	}

	async updateTransactionStatus(
		reference: string,
		status: TransactionStatus,
	): Promise<void> {
		await this.transactions.update(
			{ transactionReference: reference },
			{ status },
		);
	}

	async updateTransaction(
		id: string,
		data: Partial<SubscriptionTransaction>,
	): Promise<void> {
		await this.transactions.update({ id }, data);
	}
}
