import { IsOptional, IsNumber, Min, IsString, IsEnum } from "class-validator";
import { Transform } from "class-transformer";
import { Role } from "@/modules/users/enums/role.enum";

export class PaginationQuery {
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Transform(({ value }: { value: string }) => parseInt(value))
	page?: number;

	@IsOptional()
	@IsNumber()
	@Min(5)
	@Transform(({ value }: { value: string }) => parseInt(value))
	limit?: number;

	@IsOptional()
	@IsString()
	search?: string;

	@IsOptional()
	@IsEnum(Role)
	role?: Role;
}
