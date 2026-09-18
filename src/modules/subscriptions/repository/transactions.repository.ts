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

	async upsertByReference(
		data: Partial<SubscriptionTransaction> & {
			transactionReference: string;
			accountId: string;
		},
	): Promise<{ transaction: SubscriptionTransaction; created: boolean }> {
		const existing = await this.findByReference(data.transactionReference);
		if (existing) {
			await this.updateTransaction(existing.id, {
				status: data.status ?? existing.status,
				amount: data.amount ?? existing.amount,
				currency: data.currency ?? existing.currency,
				subscriptionId:
					data.subscriptionId !== undefined
						? data.subscriptionId
						: existing.subscriptionId,
				planId: data.planId !== undefined ? data.planId : existing.planId,
				paymentMethod: data.paymentMethod ?? existing.paymentMethod,
				paystackCustomerCode:
					data.paystackCustomerCode !== undefined
						? data.paystackCustomerCode
						: existing.paystackCustomerCode,
				metadata: {
					...(existing.metadata || {}),
					...(data.metadata || {}),
				},
			});
			const transaction =
				(await this.findByReference(data.transactionReference)) ||
				existing;
			return { transaction, created: false };
		}

		const transaction = await this.createTransaction(data);
		return { transaction, created: true };
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

	async findByAccountIdPaginated(
		accountId: string,
		limit: number,
		offset: number,
	): Promise<{ transactions: SubscriptionTransaction[]; total: number }> {
		const [transactions, total] = await this.transactions.findAndCount({
			where: { accountId },
			relations: ["plan", "subscription"],
			order: { createdAt: "DESC" },
			take: limit,
			skip: offset,
		});

		return { transactions, total };
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
