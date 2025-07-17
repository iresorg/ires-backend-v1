import { Injectable, NotFoundException } from "@nestjs/common";
import { TicketCategoryRepository } from "./repository";
import {
	TDatabaseService,
	TDatabaseTransaction,
} from "@/shared/database/datasource";
import { TicketCategoryNotFoundError } from "@/shared/errors/ticket.errors";

@Injectable()
export class TicketCategoriesService {
	constructor(
		private readonly categoryRepo: TicketCategoryRepository,
		private readonly databaseservice: TDatabaseService,
	) {}

	async createCategory(
		body: { name: string; subCategories?: string[] },
		trx?: TDatabaseTransaction,
	) {
		const { name, subCategories } = body;
		if (subCategories.length) {
			return this.databaseservice.withTransaction(async (trx) => {
				const category = await this.categoryRepo.createCategory(
					name,
					trx,
				);
				category.subCategories = await Promise.all(
					subCategories.map((name) =>
						this.categoryRepo.createSubCategory(
							{ categoryId: category.id, name },
							trx,
						),
					),
				);

				return category;
			});
		}
		return this.categoryRepo.createCategory(name, trx);
	}

	async getAllCategories(trx?: TDatabaseTransaction) {
		return this.categoryRepo.getAllCategories(trx);
	}

	async getCategory(id: string, trx?: TDatabaseTransaction) {
		const category = await this.categoryRepo.getCategory(id, trx);

		if (!category) throw new TicketCategoryNotFoundError();

		return category;
	}

	async updateCategory(id: string, name: string) {
		const category = await this.getCategory(id);

		category.name = name;

		await this.categoryRepo.updateCategory(id, name);

		return category;
	}

	async deleteCategory(id: string) {
		await this.categoryRepo.deleteCategory(id);
	}

	async createSubCategory(
		body: { categoryId: string; name: string },
		trx?: TDatabaseTransaction,
	) {
		return this.categoryRepo.createSubCategory(body, trx);
	}

	async updateSubCategory(id: string, name: string) {
		const subCategory = await this.categoryRepo.getSubCategory(id);

		if (!subCategory) throw new NotFoundException("Subcategory not found");

		await this.categoryRepo.updateSubCategory(id, name);

		subCategory.name = name;

		return subCategory;
	}

	async deleteSubCategory(id: string) {
		await this.categoryRepo.deleteSubCategory(id);
	}
}
