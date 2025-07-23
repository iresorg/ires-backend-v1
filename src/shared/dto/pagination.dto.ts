import { IsOptional, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class PaginationDto {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	limit?: number = 10;

	get offset(): number {
		return ((this.page ?? 1) - 1) * (this.limit ?? 10);
	}
}
