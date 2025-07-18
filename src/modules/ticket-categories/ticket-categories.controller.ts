import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Delete,
	UseGuards,
	Patch,
	ParseUUIDPipe,
} from "@nestjs/common";
import { TicketCategoriesService } from "./ticket-categories.service";
import { AuthGuard } from "@/shared/guards/auth.guard";
import { CreateCategoryDto } from "./dto/create-category.dto";

@UseGuards(AuthGuard)
@Controller("ticket-categories")
export class TicketCategoriesController {
	constructor(private readonly service: TicketCategoriesService) {}

	@Post()
	async createCategory(@Body() body: CreateCategoryDto) {
		const category = await this.service.createCategory(body);
		return {
			message: "Category created successfully",
			data: category,
		};
	}

	@Get()
	async getAllCategories() {
		const categories = await this.service.getAllCategories();
		return {
			message: "Categories fetched successfully",
			data: categories,
		};
	}

	@Get(":id")
	async getCategory(@Param("id", ParseUUIDPipe) id: string) {
		const category = await this.service.getCategory(id);
		return {
			message: "Category fetched successfully",
			data: category,
		};
	}

	@Patch(":id")
	async updateCategory(
		@Param("id", ParseUUIDPipe) id: string,
		@Body("name") name: string,
	) {
		const category = await this.service.updateCategory(id, name);
		return {
			message: "Category updated successfully",
			data: category,
		};
	}

	@Delete(":id")
	async deleteCategory(@Param("id", ParseUUIDPipe) id: string) {
		await this.service.deleteCategory(id);
		return {
			message: "Category deleted successfully",
			data: null,
		};
	}

	// SubCategory endpoints
	@Post(":categoryId/sub-categories")
	async createSubCategory(
		@Param("categoryId", ParseUUIDPipe) categoryId: string,
		@Body("name") name: string,
	) {
		const data = await this.service.createSubCategory({
			categoryId,
			name,
		});
		return {
			message: "SubCategory created successfully",
			data,
		};
	}

	@Patch("sub-categories/:id")
	async updateSubCategory(
		@Param("id", ParseUUIDPipe) id: string,
		@Body("name") name: string,
	) {
		const data = await this.service.updateSubCategory(id, name);
		return {
			message: "SubCategory updated successfully",
			data,
		};
	}

	@Delete("sub-categories/:id")
	async deleteSubCategory(@Param("id", ParseUUIDPipe) id: string) {
		await this.service.deleteSubCategory(id);
		return {
			message: "SubCategory deleted successfully",
			data: null,
		};
	}
}
