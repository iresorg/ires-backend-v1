import { IsOptional, IsString, IsEnum, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export enum AccountRoleFilter {
	INDIVIDUAL = "individual",
	ORGANIZATION = "organization",
}

export enum EmailVerifiedFilter {
	VERIFIED = "verified",
	NOT_VERIFIED = "not_verified",
}

export class UsersQueryDto {
	@ApiPropertyOptional({
		description: "Search by name or email",
		example: "john@example.com",
	})
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({
		description: "Filter by account role",
		enum: AccountRoleFilter,
		example: AccountRoleFilter.INDIVIDUAL,
	})
	@IsOptional()
	@IsEnum(AccountRoleFilter)
	role?: AccountRoleFilter;

	@ApiPropertyOptional({
		description: "Filter by email verification status",
		enum: EmailVerifiedFilter,
		example: EmailVerifiedFilter.VERIFIED,
	})
	@IsOptional()
	@IsEnum(EmailVerifiedFilter)
	emailVerified?: EmailVerifiedFilter;

	@ApiPropertyOptional({
		description: "Filter by joined date (start date)",
		example: "2024-01-01",
	})
	@IsOptional()
	@IsDateString()
	joinedDateFrom?: string;

	@ApiPropertyOptional({
		description: "Filter by joined date (end date)",
		example: "2024-12-31",
	})
	@IsOptional()
	@IsDateString()
	joinedDateTo?: string;

	@ApiPropertyOptional({
		description: "Page number (starts from 1)",
		example: 1,
		minimum: 1,
	})
	@IsOptional()
	@Transform(({ value }) => parseInt(value))
	page?: number;

	@ApiPropertyOptional({
		description: "Number of items per page (minimum 5)",
		example: 10,
		minimum: 5,
	})
	@IsOptional()
	@Transform(({ value }) => parseInt(value))
	limit?: number;
}
