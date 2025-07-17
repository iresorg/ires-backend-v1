import { IsArray, IsOptional, IsString } from "class-validator";

export class CreateCategoryDto {
	@IsString()
	name: string;

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	subCategories?: string[];
}
