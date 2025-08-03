import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TicketCategory } from "./entities/ticket-category.entity";
import { EntityTarget, Repository } from "typeorm";
import { TicketSubCategory } from "./entities/ticket-sub-category.entity";
import { TDatabaseTransaction } from "@/shared/database/datasource";

@Injectable()
export class TicketCategoryRepository {
	constructor(
		@InjectRepository(TicketCategory)
		private categoryRepo: Repository<TicketCategory>,
		@InjectRepository(TicketSubCategory)
		private subCategory: Repository<TicketSubCategory>,
	) {}

	async createCategory(name: string, trx?: TDatabaseTransaction) {
		const repo = this.getRepo(TicketCategory, trx);

		return repo.save(repo.create({ name }));
	}

	async updateCategory(
		categoryId: string,
		name: string,
		trx?: TDatabaseTransaction,
	) {
		const repo = this.getRepo(TicketCategory, trx);

		await repo.update({ id: categoryId }, { name });
	}

	async updateSubCategory(
		id: string,
		name: string,
		trx?: TDatabaseTransaction,
	) {
		const repo = this.getRepo(TicketSubCategory, trx);

		await repo.update({ id }, { name });
	}

	async getAllCategories(trx?: TDatabaseTransaction) {
		const repo = this.getRepo(TicketCategory, trx);

		return repo.find({
			relations: {
				subCategories: true,
			},
			order: { name: "ASC" },
		});
	}

	async createSubCategory(
		body: { categoryId: string; name: string },
		trx?: TDatabaseTransaction,
	) {
		const repo = this.getRepo(TicketSubCategory, trx);

		return repo.save(
			repo.create({
				category: { id: body.categoryId },
				name: body.name,
			}),
		);
	}

	async getCategory(id: string, trx?: TDatabaseTransaction) {
		const repo = this.getRepo(TicketCategory, trx);

		return repo.findOne({
			where: {
				id,
			},
			relations: {
				subCategories: true,
			},
		});
	}

	async deleteCategory(id: string, trx?: TDatabaseTransaction) {
		const repo = this.getRepo(TicketCategory, trx);

		return repo.delete(id);
	}

	async deleteSubCategory(id: string, trx?: TDatabaseTransaction) {
		const repo = this.getRepo(TicketSubCategory, trx);

		return repo.delete(id);
	}

	async getSubCategory(id: string, trx?: TDatabaseTransaction) {
		const repo = this.getRepo(TicketSubCategory, trx);

		return repo.findOne({
			where: {
				id,
			},
		});
	}

	private getRepo<T extends TicketCategory | TicketSubCategory>(
		entity: EntityTarget<T>,
		trx?: TDatabaseTransaction,
	): Repository<T> {
		if (trx) {
			return trx.getContext().manager.getRepository(entity);
		}

		return entity === TicketCategory
			? (this.categoryRepo as Repository<T>)
			: (this.subCategory as Repository<T>);
	}
}
